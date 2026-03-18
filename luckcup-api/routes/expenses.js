'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const db = require('../db/connection');

// GET /expenses?month=2026-02
// 查询某月支出列表，并在当月1日自动插入房租
router.get('/', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数（格式：YYYY-MM）' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  // 如果查询当前月份，检查是否需要自动插入房租
  const today = new Date().toISOString().slice(0, 7);
  if (month === today) {
    await autoInsertRent(req.shopId, month);
  }

  try {
    const [rows] = await db.query(
      `SELECT id, date, category, amount, note, is_auto, created_at
       FROM expenses
       WHERE shop_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       ORDER BY created_at DESC`,
      [req.shopId, month]
    );

    res.json({
      month,
      expenses: rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        is_auto: !!r.is_auto,
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
      })),
    });
  } catch (e) {
    console.error('[expenses GET]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// POST /expenses
// 新增一笔支出
router.post('/', auth, async (req, res) => {
  const { date, category, amount, note } = req.body;
  if (!date || !category || amount === undefined || !note) {
    return res.status(400).json({ error: '参数不完整：date、category、amount、note 均必填' });
  }
  if (!note.trim()) {
    return res.status(400).json({ error: '备注不能为空' });
  }
  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ error: '金额必须大于 0' });
  }
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO expenses (id, shop_id, date, category, amount, note) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.shopId, date, category, parseFloat(amount), note.trim()]
    );
    res.json({ success: true, id });
  } catch (e) {
    console.error('[expenses POST]', e);
    res.status(500).json({ error: '保存失败' });
  }
});

// PUT /expenses/:id
// 修改一笔支出
router.put('/:id', auth, async (req, res) => {
  const { date, category, amount, note } = req.body;
  if (!date || !category || amount === undefined || !note) {
    return res.status(400).json({ error: '参数不完整' });
  }
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [result] = await db.query(
      'UPDATE expenses SET date=?, category=?, amount=?, note=? WHERE id=? AND shop_id=?',
      [date, category, parseFloat(amount), note.trim(), req.params.id, req.shopId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[expenses PUT]', e);
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /expenses/:id
// 删除一笔支出
router.delete('/:id', auth, async (req, res) => {
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [result] = await db.query(
      'DELETE FROM expenses WHERE id=? AND shop_id=?',
      [req.params.id, req.shopId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[expenses DELETE]', e);
    res.status(500).json({ error: '删除失败' });
  }
});

/**
 * 每月1日自动插入房租记录（如果还没有）
 * 在查询当前月支出列表时触发
 */
async function autoInsertRent(shopId, month) {
  try {
    // 只在每月1日触发
    const today = new Date().toISOString().slice(0, 10);
    if (today.slice(8, 10) !== '01') return;

    // 检查当月是否已有房租记录
    const [existing] = await db.query(
      "SELECT id FROM expenses WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=? AND category='房租'",
      [shopId, month]
    );
    if (existing.length > 0) return;

    // 从设置里拿固定房租金额
    const [settings] = await db.query(
      'SELECT fixed_rent FROM shop_settings WHERE shop_id=?',
      [shopId]
    );
    if (!settings.length) return;
    const rent = parseFloat(settings[0].fixed_rent || 0);
    if (rent <= 0) return;

    const mm = month.slice(5, 7);
    await db.query(
      'INSERT INTO expenses (id, shop_id, date, category, amount, note, is_auto) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [uuidv4(), shopId, `${month}-01`, '房租', rent, `${mm}月固定房租（自动）`]
    );
  } catch (e) {
    // 静默失败，不阻断主请求
    console.error('[autoInsertRent]', e.message);
  }
}

module.exports = router;
