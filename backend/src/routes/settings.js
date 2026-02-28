const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /settings
router.get('/', async (req, res) => {
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, name')
    .eq('id', req.shopId)
    .single();

  if (shopError) return res.status(500).json({ error: '查询失败' });

  const { data: settings, error: settingsError } = await supabase
    .from('shop_settings')
    .select('fixed_rent, platforms, expense_categories, updated_at')
    .eq('shop_id', req.shopId)
    .single();

  if (settingsError) return res.status(500).json({ error: '查询设置失败' });

  res.json({
    shopName: shop.name,
    fixedRent: parseFloat(settings.fixed_rent),
    platforms: settings.platforms,
    expenseCategories: settings.expense_categories,
    updatedAt: settings.updated_at,
    account: {
      email: req.user.email,
    },
  });
});

// PUT /settings
router.put('/', async (req, res) => {
  const { shopName, fixedRent, platforms, expenseCategories } = req.body;

  const shopUpdates = {};
  const settingsUpdates = {};

  if (shopName !== undefined) {
    if (typeof shopName !== 'string' || !shopName.trim()) {
      return res.status(400).json({ error: '店铺名称不能为空' });
    }
    shopUpdates.name = shopName.trim();
  }

  if (fixedRent !== undefined) {
    const rent = parseFloat(fixedRent);
    if (isNaN(rent) || rent < 0) {
      return res.status(400).json({ error: '房租金额无效' });
    }
    settingsUpdates.fixed_rent = rent;
  }

  if (platforms !== undefined) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: '收入平台不能为空数组' });
    }
    if (platforms.some(p => typeof p !== 'string' || !p.trim())) {
      return res.status(400).json({ error: '平台名称格式错误' });
    }
    settingsUpdates.platforms = platforms.map(p => p.trim());
  }

  if (expenseCategories !== undefined) {
    if (!Array.isArray(expenseCategories) || expenseCategories.length === 0) {
      return res.status(400).json({ error: '支出类别不能为空数组' });
    }
    if (expenseCategories.some(c => typeof c !== 'string' || !c.trim())) {
      return res.status(400).json({ error: '类别名称格式错误' });
    }
    settingsUpdates.expense_categories = expenseCategories.map(c => c.trim());
  }

  // Apply updates
  if (Object.keys(shopUpdates).length > 0) {
    const { error } = await supabase
      .from('shops')
      .update(shopUpdates)
      .eq('id', req.shopId);
    if (error) return res.status(500).json({ error: '更新店铺名称失败' });
  }

  if (Object.keys(settingsUpdates).length > 0) {
    settingsUpdates.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('shop_settings')
      .update(settingsUpdates)
      .eq('shop_id', req.shopId);
    if (error) return res.status(500).json({ error: '更新设置失败' });

    // If fixed_rent changed, auto-create this month's rent expense if not already exists
    if (settingsUpdates.fixed_rent !== undefined && settingsUpdates.fixed_rent > 0) {
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const rentDate = `${month}-01`; // First of the month

      // Check if auto rent already exists for this month
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('shop_id', req.shopId)
        .eq('category', '房租')
        .eq('is_auto', true)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('expenses').insert({
          shop_id: req.shopId,
          date: rentDate,
          category: '房租',
          amount: settingsUpdates.fixed_rent,
          note: '每月房租（自动录入）',
          is_auto: true,
        });
      }
    }
  }

  res.json({ message: '设置已更新' });
});

module.exports = router;
