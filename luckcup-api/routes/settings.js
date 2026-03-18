'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db/connection');

// GET /settings
// 获取当前店铺的全部设置
router.get('/', auth, async (req, res) => {
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [shopRows] = await db.query(
      'SELECT id, name, created_at FROM shops WHERE owner_id=?',
      [req.userId]
    );
    if (!shopRows.length) {
      return res.status(404).json({ error: '未找到店铺，请重新登录' });
    }

    const shop = shopRows[0];
    const [settingsRows] = await db.query(
      'SELECT fixed_rent, platforms, expense_categories FROM shop_settings WHERE shop_id=?',
      [shop.id]
    );
    const s = settingsRows[0] || {};

    // mysql2 对 JSON 列会自动解析，但以防万一做兼容处理
    const parseSafe = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };

    res.json({
      shopId: shop.id,
      shopName: shop.name,
      createdAt: shop.created_at,
      fixedRent: parseFloat(s.fixed_rent || 0),
      platforms: parseSafe(s.platforms, ['美团团购', '美团外卖', '淘宝闪购', '抖音团购', '小程序', '收银机']),
      expenseCategories: parseSafe(s.expense_categories, ['普货', '周边货物', '工资', '房租', '水电', '突发支出']),
    });
  } catch (e) {
    console.error('[settings GET]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// PUT /settings
// 更新设置（传哪个字段更新哪个，不传的字段不变）
router.put('/', auth, async (req, res) => {
  const { shopName, fixedRent, platforms, expenseCategories } = req.body;
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    if (shopName !== undefined) {
      await db.query(
        'UPDATE shops SET name=? WHERE owner_id=?',
        [shopName.trim(), req.userId]
      );
    }

    const updates = {};
    if (fixedRent !== undefined) updates.fixed_rent = parseFloat(fixedRent) || 0;
    if (platforms !== undefined) updates.platforms = JSON.stringify(platforms);
    if (expenseCategories !== undefined) updates.expense_categories = JSON.stringify(expenseCategories);

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k}=?`).join(', ');
      const values = [...Object.values(updates), req.shopId];
      await db.query(
        `UPDATE shop_settings SET ${setClauses}, updated_at=NOW() WHERE shop_id=?`,
        values
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error('[settings PUT]', e);
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;
