'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db/connection');

// GET /analysis/monthly-overview?month=2026-02
// 月度总览：总收入、总支出、结余、各平台收入、各类别支出
router.get('/monthly-overview', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [incomeRows] = await db.query(
      `SELECT platform, SUM(amount) AS total
       FROM daily_income
       WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?
       GROUP BY platform ORDER BY total DESC`,
      [req.shopId, month]
    );

    const [expenseRows] = await db.query(
      `SELECT category, SUM(amount) AS total
       FROM expenses
       WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?
       GROUP BY category ORDER BY total DESC`,
      [req.shopId, month]
    );

    const totalIncome = incomeRows.reduce((s, r) => s + parseFloat(r.total), 0);
    const totalExpense = expenseRows.reduce((s, r) => s + parseFloat(r.total), 0);

    res.json({
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeByPlatform: incomeRows.map(r => ({
        platform: r.platform,
        amount: parseFloat(r.total),
        percentage: totalIncome > 0
          ? parseFloat(((parseFloat(r.total) / totalIncome) * 100).toFixed(1))
          : 0,
      })),
      expenseByCategory: expenseRows.map(r => ({
        category: r.category,
        amount: parseFloat(r.total),
        percentage: totalExpense > 0
          ? parseFloat(((parseFloat(r.total) / totalExpense) * 100).toFixed(1))
          : 0,
      })),
    });
  } catch (e) {
    console.error('[analysis/monthly-overview]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// GET /analysis/breakeven?month=2026-02
// 盈亏平衡点：固定成本 + 人力 + 水电 + 近3月采购均值
router.get('/breakeven', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    // 固定房租（来自设置）
    const [settingsRows] = await db.query(
      'SELECT fixed_rent FROM shop_settings WHERE shop_id=?',
      [req.shopId]
    );
    const fixedRent = parseFloat(settingsRows[0]?.fixed_rent || 0);

    const prevMonth = getPrevMonth(month);

    // 工资：当月没有则取上月
    let salary = await sumCategory(req.shopId, '工资', month);
    if (salary === 0) salary = await sumCategory(req.shopId, '工资', prevMonth);

    // 水电：当月没有则取上月
    let utility = await sumCategory(req.shopId, '水电', month);
    if (utility === 0) utility = await sumCategory(req.shopId, '水电', prevMonth);

    // 近3个月采购成本均值（普货 + 周边货物）
    const prev3 = getPrevMonths(month, 3);
    let totalPurchase = 0;
    for (const m of prev3) {
      const goods = await sumCategory(req.shopId, '普货', m);
      const sideline = await sumCategory(req.shopId, '周边货物', m);
      totalPurchase += goods + sideline;
    }
    const purchaseCost = prev3.length > 0 ? totalPurchase / prev3.length : 0;

    const breakevenTotal = fixedRent + salary + utility + purchaseCost;

    // 当月天数
    const [yr, mo] = month.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();

    // 当前月份已到账收入
    const [incomeRows] = await db.query(
      "SELECT IFNULL(SUM(amount),0) AS total FROM daily_income WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?",
      [req.shopId, month]
    );
    const currentIncome = parseFloat(incomeRows[0].total);

    res.json({
      month,
      fixedRent,
      salary,
      utility,
      purchaseCost: Math.round(purchaseCost),
      breakevenTotal: Math.round(breakevenTotal),
      dailyBreakeven: Math.ceil(breakevenTotal / daysInMonth),
      daysInMonth,
      currentIncome,
      surplus: currentIncome - breakevenTotal,
    });
  } catch (e) {
    console.error('[analysis/breakeven]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// GET /analysis/profit?month=2026-02
// 盈亏分析：各平台利润贡献（V1 等比例分摊成本）
router.get('/profit', auth, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: '缺少 month 参数' });
  if (!req.shopId) return res.status(400).json({ error: '未找到店铺' });

  try {
    const [incomeRows] = await db.query(
      `SELECT platform, SUM(amount) AS total
       FROM daily_income
       WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?
       GROUP BY platform ORDER BY total DESC`,
      [req.shopId, month]
    );

    const [expenseRows] = await db.query(
      "SELECT IFNULL(SUM(amount),0) AS total FROM expenses WHERE shop_id=? AND DATE_FORMAT(date,'%Y-%m')=?",
      [req.shopId, month]
    );

    const totalIncome = incomeRows.reduce((s, r) => s + parseFloat(r.total), 0);
    const totalExpense = parseFloat(expenseRows[0].total);
    const balance = totalIncome - totalExpense;
    const profitRate = totalIncome > 0
      ? parseFloat(((balance / totalIncome) * 100).toFixed(1))
      : 0;

    res.json({
      month,
      totalIncome,
      totalExpense,
      balance,
      profitRate,
      byPlatform: incomeRows.map(r => {
        const income = parseFloat(r.total);
        const cost = totalIncome > 0 ? Math.round(totalExpense * (income / totalIncome)) : 0;
        return {
          platform: r.platform,
          income,
          cost,
          profit: income - cost,
          profitRate,
        };
      }),
    });
  } catch (e) {
    console.error('[analysis/profit]', e);
    res.status(500).json({ error: '查询失败' });
  }
});

// ===== 工具函数 =====

async function sumCategory(shopId, category, month) {
  const [rows] = await db.query(
    "SELECT IFNULL(SUM(amount),0) AS total FROM expenses WHERE shop_id=? AND category=? AND DATE_FORMAT(date,'%Y-%m')=?",
    [shopId, category, month]
  );
  return parseFloat(rows[0].total);
}

function getPrevMonth(month) {
  const [yr, mo] = month.split('-').map(Number);
  const d = new Date(yr, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getPrevMonths(month, n) {
  const result = [];
  let [yr, mo] = month.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    mo--;
    if (mo === 0) { mo = 12; yr--; }
    result.push(`${yr}-${String(mo).padStart(2, '0')}`);
  }
  return result;
}

module.exports = router;
