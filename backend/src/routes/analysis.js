const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: get month date range
function monthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10);
  return { startDate, endDate, year, mon };
}

// Helper: fetch monthly income total and per-platform breakdown
async function fetchMonthlyIncome(shopId, month) {
  const { startDate, endDate } = monthRange(month);

  const { data, error } = await supabase
    .from('daily_income')
    .select('platform, amount')
    .eq('shop_id', shopId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw new Error('收入查询失败');

  const platformTotals = {};
  let total = 0;
  (data || []).forEach(row => {
    const amt = parseFloat(row.amount);
    platformTotals[row.platform] = (platformTotals[row.platform] || 0) + amt;
    total += amt;
  });

  return { total, platformTotals };
}

// Helper: fetch monthly expenses total and per-category breakdown
async function fetchMonthlyExpenses(shopId, month) {
  const { startDate, endDate } = monthRange(month);

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('shop_id', shopId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw new Error('支出查询失败');

  const categoryTotals = {};
  let total = 0;
  (data || []).forEach(row => {
    const amt = parseFloat(row.amount);
    categoryTotals[row.category] = (categoryTotals[row.category] || 0) + amt;
    total += amt;
  });

  return { total, categoryTotals };
}

// GET /analysis/monthly-overview?month=YYYY-MM
router.get('/monthly-overview', async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '请提供合法的月份参数 (YYYY-MM)' });
  }

  try {
    const [incomeResult, expenseResult] = await Promise.all([
      fetchMonthlyIncome(req.shopId, month),
      fetchMonthlyExpenses(req.shopId, month),
    ]);

    const balance = incomeResult.total - expenseResult.total;

    // Compute percentages for platform income breakdown
    const platformBreakdown = Object.entries(incomeResult.platformTotals).map(([platform, amount]) => ({
      platform,
      amount: parseFloat(amount.toFixed(2)),
      percentage: incomeResult.total > 0
        ? parseFloat(((amount / incomeResult.total) * 100).toFixed(1))
        : 0,
    }));

    // Compute percentages for expense category breakdown
    const categoryBreakdown = Object.entries(expenseResult.categoryTotals).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
      percentage: expenseResult.total > 0
        ? parseFloat(((amount / expenseResult.total) * 100).toFixed(1))
        : 0,
    }));

    res.json({
      month,
      totalIncome: parseFloat(incomeResult.total.toFixed(2)),
      totalExpense: parseFloat(expenseResult.total.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      isProfit: balance >= 0,
      platformBreakdown,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analysis/profit?month=YYYY-MM
router.get('/profit', async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '请提供合法的月份参数 (YYYY-MM)' });
  }

  try {
    const [incomeResult, expenseResult] = await Promise.all([
      fetchMonthlyIncome(req.shopId, month),
      fetchMonthlyExpenses(req.shopId, month),
    ]);

    const profit = incomeResult.total - expenseResult.total;
    const profitRate = incomeResult.total > 0
      ? parseFloat(((profit / incomeResult.total) * 100).toFixed(1))
      : 0;

    // V1: all platforms share cost proportionally (same profit rate per platform)
    const platformContributions = Object.entries(incomeResult.platformTotals).map(([platform, amount]) => {
      const incomeShare = incomeResult.total > 0 ? amount / incomeResult.total : 0;
      const allocatedExpense = expenseResult.total * incomeShare;
      const platformProfit = amount - allocatedExpense;
      return {
        platform,
        income: parseFloat(amount.toFixed(2)),
        allocatedExpense: parseFloat(allocatedExpense.toFixed(2)),
        profit: parseFloat(platformProfit.toFixed(2)),
        profitRate,
      };
    });

    res.json({
      month,
      totalIncome: parseFloat(incomeResult.total.toFixed(2)),
      totalExpense: parseFloat(expenseResult.total.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      profitRate,
      isProfit: profit >= 0,
      platformContributions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /analysis/breakeven?month=YYYY-MM
router.get('/breakeven', async (req, res) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '请提供合法的月份参数 (YYYY-MM)' });
  }

  try {
    const { startDate, endDate, year, mon } = monthRange(month);

    // Fetch settings for fixed rent
    const { data: settings } = await supabase
      .from('shop_settings')
      .select('fixed_rent')
      .eq('shop_id', req.shopId)
      .single();

    const fixedRent = settings ? parseFloat(settings.fixed_rent) : 0;

    // Fetch current month expenses grouped by category
    const { data: currentExpenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('shop_id', req.shopId)
      .gte('date', startDate)
      .lte('date', endDate);

    const currentCatTotals = {};
    (currentExpenses || []).forEach(row => {
      const amt = parseFloat(row.amount);
      currentCatTotals[row.category] = (currentCatTotals[row.category] || 0) + amt;
    });

    // Helper to get last month's category total
    const getLastMonthCategory = async (category) => {
      const lastMonth = mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
      const { startDate: ls, endDate: le } = monthRange(lastMonth);
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('shop_id', req.shopId)
        .eq('category', category)
        .gte('date', ls)
        .lte('date', le);
      return (data || []).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    };

    // 工资: use current month, fallback to last month
    let laborCost = currentCatTotals['工资'] || 0;
    if (laborCost === 0) {
      laborCost = await getLastMonthCategory('工资');
    }

    // 水电: use current month, fallback to last month
    let utilityCost = currentCatTotals['水电'] || 0;
    if (utilityCost === 0) {
      utilityCost = await getLastMonthCategory('水电');
    }

    // 采购成本 (普货 + 周边货物): average of last 3 months
    const purchaseMonths = [];
    for (let i = 1; i <= 3; i++) {
      let y = year, m = mon - i;
      while (m <= 0) { m += 12; y -= 1; }
      purchaseMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    }

    const purchaseTotals = await Promise.all(purchaseMonths.map(async (pm) => {
      const { startDate: ps, endDate: pe } = monthRange(pm);
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('shop_id', req.shopId)
        .in('category', ['普货', '周边货物'])
        .gte('date', ps)
        .lte('date', pe);
      return (data || []).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    }));

    const avgPurchaseCost = purchaseTotals.reduce((s, v) => s + v, 0) / 3;

    // Total breakeven threshold
    const breakevenMonthly = fixedRent + laborCost + utilityCost + avgPurchaseCost;

    // Days in current month
    const daysInMonth = new Date(year, mon, 0).getDate();
    const breakevenDaily = breakevenMonthly / daysInMonth;

    // Current month actual income
    const { total: currentIncome } = await fetchMonthlyIncome(req.shopId, month);

    // Today's day of month (for progress calculation)
    const today = new Date();
    const currentDay = today.getFullYear() === year && (today.getMonth() + 1) === mon
      ? today.getDate()
      : daysInMonth;

    const expectedByNow = breakevenDaily * currentDay;
    const progressRate = expectedByNow > 0
      ? parseFloat(((currentIncome / expectedByNow) * 100).toFixed(1))
      : 0;

    res.json({
      month,
      breakevenMonthly: parseFloat(breakevenMonthly.toFixed(2)),
      breakevenDaily: parseFloat(breakevenDaily.toFixed(2)),
      costBreakdown: {
        fixedRent: parseFloat(fixedRent.toFixed(2)),
        laborCost: parseFloat(laborCost.toFixed(2)),
        utilityCost: parseFloat(utilityCost.toFixed(2)),
        avgPurchaseCost: parseFloat(avgPurchaseCost.toFixed(2)),
      },
      currentIncome: parseFloat(currentIncome.toFixed(2)),
      currentDay,
      daysInMonth,
      expectedByNow: parseFloat(expectedByNow.toFixed(2)),
      progressRate,
      isOnTrack: currentIncome >= expectedByNow,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
