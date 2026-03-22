'use strict';

const mysql = require('mysql2/promise');

// Serverless 环境下连接池可能在两次调用之间被服务器关闭
// 用懒加载 + 自动重建的方式替代直接 export pool

const POOL_CONFIG = {
  host:              process.env.DB_HOST,
  port:              parseInt(process.env.DB_PORT || '3306', 10),
  user:              process.env.DB_USER,
  password:          process.env.DB_PASSWORD,
  database:          process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:   1,          // Serverless 单实例单连接，避免连接堆积
  queueLimit:        0,
  connectTimeout:    15000,      // CynosDB Serverless 从暂停唤醒需要时间
  enableKeepAlive:   true,
  keepAliveInitialDelay: 10000,
  timezone:          '+08:00',
  charset:           'utf8mb4',
};

let pool = null;

function createPool() {
  pool = mysql.createPool(POOL_CONFIG);
  return pool;
}

function getPool() {
  if (!pool) createPool();
  return pool;
}

function isRetrySafeQuery(sql) {
  const normalized = String(sql || '')
    .trim()
    .replace(/^\(+/, '')
    .toUpperCase();

  return (
    normalized.startsWith('SELECT')   ||
    normalized.startsWith('SHOW')     ||
    normalized.startsWith('DESCRIBE') ||
    normalized.startsWith('DESC')     ||
    normalized.startsWith('EXPLAIN')
  );
}

// 判断是否为"连接已断开"类错误
function isStaleError(err) {
  return (
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ECONNRESET'               ||
    err.code === 'EPIPE'                    ||
    err.code === 'ECONNREFUSED'             ||
    (err.message && (
      err.message.includes('closed state') ||
      err.message.includes('Connection lost')
    ))
  );
}

// 销毁旧连接池，重建一个新的
async function rebuildPool() {
  console.warn('[db] 连接断开，重建连接池...');
  if (pool) {
    try { await pool.end(); } catch (_) { /* 忽略销毁时的错误 */ }
  }
  createPool();
}

/**
 * query(sql, params) — 替代 pool.query()
 * 路由里用法不变：const [rows] = await db.query(sql, params)
 */
async function query(sql, params) {
  try {
    const [rows] = await getPool().query(sql, params);
    return [rows];
  } catch (err) {
    // 只自动重试读查询，避免 INSERT/UPDATE/DELETE 在“服务端已执行但客户端断线”时被重复回放。
    if (isStaleError(err) && isRetrySafeQuery(sql)) {
      await rebuildPool();
      const [rows] = await pool.query(sql, params);
      return [rows];
    }
    throw err;
  }
}

/**
 * getConnection() — 替代 pool.getConnection()，用于事务
 * 路由里用法不变：const conn = await db.getConnection()
 */
async function getConnection() {
  try {
    return await getPool().getConnection();
  } catch (err) {
    if (isStaleError(err)) {
      await rebuildPool();
      return await pool.getConnection();
    }
    throw err;
  }
}

module.exports = { query, getConnection, isStaleError };
