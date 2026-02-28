const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /income/daily?date=YYYY-MM-DD
router.get('/daily', async (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '请提供合法的日期参数 (YYYY-MM-DD)' });
  }

  const { data, error } = await supabase
    .from('daily_income')
    .select('platform, amount')
    .eq('shop_id', req.shopId)
    .eq('date', date);

  if (error) return res.status(500).json({ error: '查询失败' });

  // Build a platform → amount map
  const incomeMap = {};
  (data || []).forEach(row => {
    incomeMap[row.platform] = parseFloat(row.amount);
  });

  res.json({ date, income: incomeMap });
});

// POST /income/daily — UPSERT all platforms for a given date
router.post('/daily', async (req, res) => {
  const { date, income } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '请提供合法的日期参数 (YYYY-MM-DD)' });
  }
  if (!income || typeof income !== 'object' || Array.isArray(income)) {
    return res.status(400).json({ error: 'income 字段格式错误，应为 {平台名: 金额}' });
  }

  // Validate amounts
  for (const [platform, amount] of Object.entries(income)) {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      return res.status(400).json({ error: `平台 "${platform}" 的金额无效` });
    }
  }

  const rows = Object.entries(income).map(([platform, amount]) => ({
    shop_id: req.shopId,
    date,
    platform,
    amount: parseFloat(amount),
  }));

  const { error } = await supabase
    .from('daily_income')
    .upsert(rows, { onConflict: 'shop_id,date,platform' });

  if (error) return res.status(500).json({ error: '保存失败' });

  res.json({ message: '收入已保存', date });
});

// GET /income/monthly?month=YYYY-MM
router.get('/monthly', async (req, res) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '请提供合法的月份参数 (YYYY-MM)' });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10); // last day of month

  const { data, error } = await supabase
    .from('daily_income')
    .select('date, platform, amount')
    .eq('shop_id', req.shopId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: '查询失败' });

  // Aggregate by platform
  const platformTotals = {};
  let total = 0;

  (data || []).forEach(row => {
    const amt = parseFloat(row.amount);
    platformTotals[row.platform] = (platformTotals[row.platform] || 0) + amt;
    total += amt;
  });

  // Daily breakdown
  const dailyMap = {};
  (data || []).forEach(row => {
    const amt = parseFloat(row.amount);
    dailyMap[row.date] = (dailyMap[row.date] || 0) + amt;
  });

  res.json({
    month,
    total: parseFloat(total.toFixed(2)),
    platformTotals,
    dailyBreakdown: dailyMap,
  });
});

module.exports = router;
