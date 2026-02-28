const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_PLATFORMS = ['美团团购', '美团外卖', '淘宝闪购', '抖音团购', '小程序', '收银机'];
const DEFAULT_EXPENSE_CATEGORIES = ['普货', '周边货物', '工资', '房租', '水电', '突发支出'];

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, shopName } = req.body;

  if (!email || !password || !shopName) {
    return res.status(400).json({ error: '邮箱、密码和店铺名称均为必填项' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm for development
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.code === 'email_exists') {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }
    return res.status(400).json({ error: authError.message });
  }

  const userId = authData.user.id;

  // Create shop record
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .insert({ owner_id: userId, name: shopName })
    .select('id')
    .single();

  if (shopError) {
    // Rollback: delete the created auth user
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: '创建店铺失败，请重试' });
  }

  // Create shop_settings with defaults
  const { error: settingsError } = await supabase
    .from('shop_settings')
    .insert({
      shop_id: shop.id,
      fixed_rent: 0,
      platforms: DEFAULT_PLATFORMS,
      expense_categories: DEFAULT_EXPENSE_CATEGORIES,
    });

  if (settingsError) {
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: '初始化设置失败，请重试' });
  }

  res.status(201).json({ message: '注册成功，请登录' });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码均为必填项' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  // Fetch shop info for the response
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('owner_id', data.user.id)
    .single();

  res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    shop: shop || null,
  });
});

// POST /auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization.slice(7);
  await supabase.auth.admin.signOut(token);
  res.json({ message: '已退出登录' });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: '缺少 refreshToken' });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) {
    return res.status(401).json({ error: 'Token 刷新失败，请重新登录' });
  }

  res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  });
});

module.exports = router;
