'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const DEFAULT_PLATFORMS = ['美团团购', '美团外卖', '外卖其他', '抖音团购', '小程序', '门店收银'];
const DEFAULT_CATEGORIES = ['原料货品', '周边货物', '工资', '房租', '水电', '其他支出', '活动', '物业', '其他'];

// POST /auth/register — 注册新账号
router.post('/register', async (req, res) => {
  const { phone, password, shopName } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '手机号和密码必填' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }

  try {
    // 检查手机号是否已注册
    const [existing] = await db.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: '该手机号已注册，请直接登录' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const shopId = uuidv4();
    const settingsId = uuidv4();
    const name = shopName || 'LuckCup 我的店铺';

    // 顺序插入（不用事务，避免 Serverless 环境下 conn.rollback() 在断连时崩溃）
    // 所有操作走 db.query()；仅读查询会自动断连重试，shop 失败时手动清理 user 记录
    await db.query(
      'INSERT INTO users (id, phone, password_hash) VALUES (?, ?, ?)',
      [userId, phone, passwordHash]
    );

    try {
      await db.query(
        'INSERT INTO shops (id, owner_id, name) VALUES (?, ?, ?)',
        [shopId, userId, name]
      );

      await db.query(
        'INSERT INTO shop_settings (id, shop_id, fixed_rent, platforms, expense_categories) VALUES (?, ?, 0, ?, ?)',
        [settingsId, shopId, JSON.stringify(DEFAULT_PLATFORMS), JSON.stringify(DEFAULT_CATEGORIES)]
      );
    } catch (e) {
      // shop 或 settings 插入失败，清理已插入的 user，保持数据干净
      try { await db.query('DELETE FROM users WHERE id = ?', [userId]); } catch (_) {}
      throw e;
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, shopId, shopName: name });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /auth/login — 登录
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '手机号和密码必填' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    const [shops] = await db.query(
      'SELECT id, name FROM shops WHERE owner_id = ? LIMIT 1',
      [user.id]
    );
    const shop = shops[0] || null;

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      shopId: shop ? shop.id : null,
      shopName: shop ? shop.name : null,
    });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

module.exports = router;
