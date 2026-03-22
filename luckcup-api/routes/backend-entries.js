'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const db = require('../db/connection');

const BACKEND_INCOME_CATEGORIES = [
  '调货收入', 'B端/客户收入', '其他商品/原料转卖收入',
  '周边商品收入', '营业外收入', '废品/退款类收入', '费用回收/其他收入',
];

const BACKEND_EXPENSE_CATEGORIES = [
  '分红/老板支出', '税费/管理费',
];

// GET /backend-entries/categories
router.get('/categories', auth, (req, res) => {
  res.json({
    income: BACKEND_INCOME_CATEGORIES,
    expense: BACKEND_EXPENSE_CATEGORIES,
  });
});

// GET /backend-entries?month=YYYY-MM&type=income|expense
router.get('/', auth, async (req, res) => {
  const { month, type } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    let sql = "SELECT * FROM backend_entries WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?";
    const params = [req.shopId, month];
    if (type) {
      sql += ' AND type=?';
      params.push(type);
    }
    sql += ' ORDER BY date DESC, created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json({ month, entries: rows });
  } catch (e) {
    console.error('[backend-entries GET]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// POST /backend-entries
router.post('/', auth, async (req, res) => {
  const { date, type, category, amount, note } = req.body;
  if (!date || !type || !category || amount === undefined) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO backend_entries (id, shop_id, date, type, category, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.shopId, date, type, category, Number(amount), note || '']
    );
    res.json({ success: true, id });
  } catch (e) {
    console.error('[backend-entries POST]', e);
    res.status(500).json({ error: '保存失败' });
  }
});

// PUT /backend-entries/:id
router.put('/:id', auth, async (req, res) => {
  const { date, type, category, amount, note } = req.body;
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    await db.query(
      'UPDATE backend_entries SET date=?, type=?, category=?, amount=?, note=? WHERE id=? AND shop_id=?',
      [date, type, category, Number(amount), note || '', req.params.id, req.shopId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[backend-entries PUT]', e);
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /backend-entries/:id
router.delete('/:id', auth, async (req, res) => {
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    await db.query(
      'DELETE FROM backend_entries WHERE id=? AND shop_id=?',
      [req.params.id, req.shopId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[backend-entries DELETE]', e);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
