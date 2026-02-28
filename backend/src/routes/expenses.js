const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /expenses?month=YYYY-MM
router.get('/', async (req, res) => {
  const { month } = req.query;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: '请提供合法的月份参数 (YYYY-MM)' });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('expenses')
    .select('id, date, category, amount, note, is_auto, created_at')
    .eq('shop_id', req.shopId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: '查询失败' });

  res.json({ month, expenses: data || [] });
});

// POST /expenses — 新增支出
router.post('/', async (req, res) => {
  const { date, category, amount, note, is_auto } = req.body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '请提供合法的日期 (YYYY-MM-DD)' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: '支出类别为必填项' });
  }
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: '金额为必填项' });
  }
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: '金额必须大于0' });
  }
  if (!note || typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({ error: '备注为必填项' });
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      shop_id: req.shopId,
      date,
      category: category.trim(),
      amount: amountNum,
      note: note.trim(),
      is_auto: is_auto === true,
    })
    .select('id, date, category, amount, note, is_auto, created_at')
    .single();

  if (error) return res.status(500).json({ error: '保存失败' });

  res.status(201).json(data);
});

// PUT /expenses/:id — 修改支出
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date, category, amount, note } = req.body;

  // Verify ownership
  const { data: existing, error: findError } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('shop_id', req.shopId)
    .single();

  if (findError || !existing) {
    return res.status(404).json({ error: '支出记录不存在' });
  }

  const updates = {};
  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式错误 (YYYY-MM-DD)' });
    }
    updates.date = date;
  }
  if (category !== undefined) {
    if (!category.trim()) return res.status(400).json({ error: '类别不能为空' });
    updates.category = category.trim();
  }
  if (amount !== undefined) {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: '金额必须大于0' });
    }
    updates.amount = amountNum;
  }
  if (note !== undefined) {
    if (!note.trim()) return res.status(400).json({ error: '备注不能为空' });
    updates.note = note.trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '未提供任何修改内容' });
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .eq('shop_id', req.shopId)
    .select('id, date, category, amount, note, is_auto, created_at')
    .single();

  if (error) return res.status(500).json({ error: '更新失败' });

  res.json(data);
});

// DELETE /expenses/:id — 删除支出
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: findError } = await supabase
    .from('expenses')
    .select('id')
    .eq('id', id)
    .eq('shop_id', req.shopId)
    .single();

  if (findError || !existing) {
    return res.status(404).json({ error: '支出记录不存在' });
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('shop_id', req.shopId);

  if (error) return res.status(500).json({ error: '删除失败' });

  res.json({ message: '已删除' });
});

module.exports = router;
