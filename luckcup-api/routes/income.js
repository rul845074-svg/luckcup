'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const db = require('../db/connection');

// GET /income/daily?date=2026-02-28
// 查询某天各平台收入，以及本月累计
router.get('/daily', auth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: '缺少 date 参数（格式：YYYY-MM-DD）' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺，请先完成注册' });

  try {
    const [items] = await db.query(
      'SELECT platform, amount FROM daily_income WHERE shop_id = ? AND date = ?',
      [req.shopId, date]
    );

    const month = date.slice(0, 7); // YYYY-MM
    const [monthlyRows] = await db.query(
      "SELECT IFNULL(SUM(amount), 0) AS total FROM daily_income WHERE shop_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?",
      [req.shopId, month]
    );

    res.json({
      date,
      items: items.map(r => ({ platform: r.platform, amount: parseFloat(r.amount) })),
      monthlyTotal: parseFloat(monthlyRows[0].total),
    });
  } catch (e) {
    console.error('[income/daily GET]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// POST /income/daily
// 保存/更新某天的收入（UPSERT，基于 shop_id+date+platform 唯一约束）
router.post('/daily', auth, async (req, res) => {
  const { date, items } = req.body;
  if (!date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '参数不完整，需要 date 和 items 数组' });
  }
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    for (const item of items) {
      if (!item.platform || item.amount === undefined) continue;
      await db.query(
        `INSERT INTO daily_income (id, shop_id, date, platform, amount)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [uuidv4(), req.shopId, date, item.platform, parseFloat(item.amount) || 0]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[income/daily POST]', e);
    res.status(500).json({ error: '保存失败' });
  }
});

// GET /income/monthly?month=2026-02
// 查询某月各平台收入汇总
router.get('/monthly', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数（格式：YYYY-MM）' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [rows] = await db.query(
      `SELECT platform, SUM(amount) AS total
       FROM daily_income
       WHERE shop_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       GROUP BY platform
       ORDER BY total DESC`,
      [req.shopId, month]
    );

    const totalIncome = rows.reduce((sum, r) => sum + parseFloat(r.total), 0);

    res.json({
      month,
      totalIncome,
      byPlatform: rows.map(r => ({
        platform: r.platform,
        amount: parseFloat(r.total),
        percentage: totalIncome > 0
          ? parseFloat(((parseFloat(r.total) / totalIncome) * 100).toFixed(1))
          : 0,
      })),
    });
  } catch (e) {
    console.error('[income/monthly]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// GET /income/monthly-details?month=2026-02
// 查询某月收入明细（按日、按平台）
router.get('/monthly-details', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数（格式：YYYY-MM）' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [rows] = await db.query(
      `SELECT id, date, platform, amount, created_at
       FROM daily_income
       WHERE shop_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
       ORDER BY date DESC, amount DESC, created_at DESC`,
      [req.shopId, month]
    );

    res.json({
      month,
      items: rows.map(r => ({
        id: r.id,
        date: r.date,
        platform: r.platform,
        amount: parseFloat(r.amount),
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[income/monthly-details]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// DELETE /income/:id
// 删除一条收入记录
router.delete('/:id', auth, async (req, res) => {
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [result] = await db.query(
      'DELETE FROM daily_income WHERE id = ? AND shop_id = ?',
      [req.params.id, req.shopId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[income DELETE]', e);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
