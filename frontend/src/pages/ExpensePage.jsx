import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { api } from '../utils/api';

const DEFAULT_CATEGORIES = ['普货', '周边货物', '工资', '房租', '水电', '突发支出'];

export default function ExpensePage() {
  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [form, setForm] = useState({ date: today, category: '', amount: '', note: '' });
  const [expenses, setExpenses] = useState([]);
  const [month, setMonth] = useState(currentMonth);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get('/settings');
      setCategories(data.expenseCategories || DEFAULT_CATEGORIES);
    } catch {}
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const data = await api.get(`/expenses?month=${month}`);
      setExpenses(data.expenses || []);
    } catch (err) {
      showToast(err.message);
    }
  }, [month]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleSubmit = async () => {
    if (!form.category) { showToast('请选择支出类别'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { showToast('请填写正确的金额'); return; }
    if (!form.note.trim()) { showToast('请填写备注'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, form);
        setEditingId(null);
        showToast('✅ 已更新');
      } else {
        await api.post('/expenses', form);
        showToast('✅ 已保存');
      }
      setForm({ date: today, category: '', amount: '', note: '' });
      loadExpenses();
    } catch (err) {
      showToast('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exp) => {
    setEditingId(exp.id);
    setForm({ date: exp.date, category: exp.category, amount: String(exp.amount), note: exp.note });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除该支出记录？')) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast('✅ 已删除');
      loadExpenses();
    } catch (err) {
      showToast('❌ ' + err.message);
    }
  };

  const monthlyTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        {editingId ? '修改支出' : '记支出'}
      </h1>

      {/* Category selector */}
      <div className="card mb-4">
        <p className="text-sm text-gray-500 mb-2">选择类别</p>
        <div className="grid grid-cols-3 gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setForm(f => ({ ...f, category: cat }))}
              className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                form.category === cat
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-700 active:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div className="card mb-4 space-y-3">
        <div>
          <label className="text-sm text-gray-500 block mb-1">日期</label>
          <input
            type="date"
            value={form.date}
            max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">金额（元）</label>
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2">
            <span className="text-gray-400 mr-1 text-lg">¥</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="flex-1 bg-transparent outline-none text-base text-gray-800"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">备注（必填）</label>
          <input
            type="text"
            placeholder="请填写备注说明"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="input-field"
          />
        </div>
      </div>

      <button onClick={handleSubmit} className="btn-primary mb-6" disabled={saving}>
        {saving ? '保存中...' : editingId ? '更新支出' : '保存支出'}
      </button>
      {editingId && (
        <button
          onClick={() => { setEditingId(null); setForm({ date: today, category: '', amount: '', note: '' }); }}
          className="w-full py-3 text-gray-500 text-sm text-center"
        >
          取消修改
        </button>
      )}

      {/* Month selector + list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">本月支出列表</h2>
        <input
          type="month"
          value={month}
          max={currentMonth}
          onChange={e => setMonth(e.target.value)}
          className="text-sm text-primary bg-transparent outline-none"
        />
      </div>

      <div className="card mb-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">本月支出合计</span>
          <span className="font-bold text-loss">¥{monthlyTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">暂无支出记录</div>
        )}
        {expenses.map(exp => (
          <div key={exp.id} className="card flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs bg-orange-50 text-primary px-2 py-0.5 rounded-full font-medium">
                  {exp.category}
                </span>
                {exp.is_auto && (
                  <span className="text-xs text-gray-400">自动</span>
                )}
                <span className="text-xs text-gray-400">{exp.date}</span>
              </div>
              <p className="text-gray-600 text-sm">{exp.note}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-loss">¥{parseFloat(exp.amount).toFixed(2)}</p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => handleEdit(exp)} className="text-xs text-primary">编辑</button>
                <button onClick={() => handleDelete(exp.id)} className="text-xs text-gray-400">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
