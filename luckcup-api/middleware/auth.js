'use strict';

const jwt = require('jsonwebtoken');
const db = require('../db/connection');

/**
 * JWT 认证中间件
 * 验证 Authorization: Bearer <token> 头
 * 成功后在 req 上挂载 userId 和 shopId
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;

    // 查询该用户的店铺 ID，挂载到 req 供后续路由使用
    const [rows] = await db.query(
      'SELECT id FROM shops WHERE owner_id = ? LIMIT 1',
      [payload.userId]
    );
    req.shopId = rows.length > 0 ? rows[0].id : null;

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token 无效或已过期，请重新登录' });
  }
};
