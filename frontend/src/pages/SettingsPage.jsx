import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import useAuthStore from '../store/authStore';

export default function SettingsPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore(s => s.clearAuth);

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ shopName: '', fixedRent: '', platforms: [], expenseCategories: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      setSettings(data);
      setForm({
        shopName: data.shopName,
        fixedRent: String(data.fixedRent),
        platforms: [...data.platforms],
        expenseCategories: [...data.expenseCategories],
      });
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        shopName: form.shopName,
        fixedRent: parseFloat(form.fixedRent) || 0,
        platforms: form.platforms.filter(p => p.trim()),
        expenseCategories: form.expenseCategories.filter(c => c.trim()),
      });
      showToast('✅ 设置已保存');
      load();
    } catch (err) {
      showToast('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {}
    clearAuth();
    navigate('/login', { replace: true });
  };

  const updatePlatform = (index, value) => {
    setForm(f => {
      const platforms = [...f.platforms];
      platforms[index] = value;
      return { ...f, platforms };
    });
  };

  const removePlatform = (index) => {
    setForm(f => ({ ...f, platforms: f.platforms.filter((_, i) => i !== index) }));
  };

  const addPlatform = () => {
    setForm(f => ({ ...f, platforms: [...f.platforms, ''] }));
  };

  const updateCategory = (index, value) => {
    setForm(f => {
      const expenseCategories = [...f.expenseCategories];
      expenseCategories[index] = value;
      return { ...f, expenseCategories };
    });
  };

  const removeCategory = (index) => {
    setForm(f => ({ ...f, expenseCategories: f.expenseCategories.filter((_, i) => i !== index) }));
  };

  const addCategory = () => {
    setForm(f => ({ ...f, expenseCategories: [...f.expenseCategories, ''] }));
  };

  if (loading) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">我的设置</h1>

      {settings && (
        <div className="text-sm text-gray-400 mb-4 text-center">{settings.account?.phone}</div>
      )}

      {/* Shop name */}
      <div className="card mb-4">
        <label className="text-sm text-gray-500 block mb-1.5">店铺名称</label>
        <input
          type="text"
          className="input-field"
          value={form.shopName}
          onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
        />
      </div>

      {/* Fixed rent */}
      <div className="card mb-4">
        <label className="text-sm text-gray-500 block mb-1.5">固定房租（元/月）</label>
        <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-gray-400 mr-1">¥</span>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="0"
            value={form.fixedRent}
            onChange={e => setForm(f => ({ ...f, fixedRent: e.target.value }))}
            className="flex-1 bg-transparent outline-none text-base text-gray-800"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">设置后每月自动录入房租支出</p>
      </div>

      {/* Platforms */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-medium text-gray-700">收入平台</h2>
          <button onClick={addPlatform} className="text-primary text-sm">+ 添加</button>
        </div>
        <div className="space-y-2">
          {form.platforms.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className="input-field flex-1"
                value={p}
                onChange={e => updatePlatform(i, e.target.value)}
              />
              <button
                onClick={() => removePlatform(i)}
                className="text-gray-400 text-xl w-8 shrink-0"
              >×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Expense categories */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-medium text-gray-700">支出类别</h2>
          <button onClick={addCategory} className="text-primary text-sm">+ 添加</button>
        </div>
        <div className="space-y-2">
          {form.expenseCategories.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className="input-field flex-1"
                value={c}
                onChange={e => updateCategory(i, e.target.value)}
              />
              <button
                onClick={() => removeCategory(i)}
                className="text-gray-400 text-xl w-8 shrink-0"
              >×</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary mb-3" disabled={saving}>
        {saving ? '保存中...' : '保存设置'}
      </button>

      <button
        onClick={handleLogout}
        className="w-full py-3 text-center text-loss font-medium rounded-xl border border-loss/30 active:bg-red-50"
      >
        退出登录
      </button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
