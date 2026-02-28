const { supabase } = require('../config/supabase');

/**
 * Verifies the Bearer token from Supabase Auth.
 * Attaches req.user (Supabase user object) and req.shopId.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证 Token' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }

  // Fetch the shop belonging to this user
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (shopError || !shop) {
    return res.status(403).json({ error: '未找到关联店铺，请重新注册' });
  }

  req.user = user;
  req.shopId = shop.id;
  next();
}

module.exports = { authenticate };
