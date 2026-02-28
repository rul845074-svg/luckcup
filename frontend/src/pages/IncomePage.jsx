import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { api } from '../utils/api';

const DEFAULT_PLATFORMS = ['美团团购', '美团外卖', '淘宝闪购', '抖音团购', '小程序', '收银机'];

export default function IncomePage() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [income, setIncome] = useState({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [platforms, setPlatforms] = useState(DEFAULT_PLATFORMS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const month = date.slice(0, 7);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get('/settings');
      setPlatforms(data.platforms || DEFAULT_PLATFORMS);
    } catch {}
  }, []);

  const loadIncome = useCallback(async () => {
    setLoading(true);
    try {
      const [daily, monthly] = await Promise.all([
        api.get(`/income/daily?date=${date}`),
        api.get(`/income/monthly?month=${month}`),
      ]);
      setIncome(daily.income || {});
      setMonthlyTotal(monthly.total || 0);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, month]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadIncome(); }, [loadIncome]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/income/daily', { date, income });
      showToast('✅ 已保存');
      loadIncome();
    } catch (err) {
      showToast('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const dailyTotal = Object.values(income).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const changeDate = (days) => {
    setDate(dayjs(date).add(days, 'day').format('YYYY-MM-DD'));
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-800 mb-4">今日收入</h1>

      {/* Date picker row */}
      <div className="card flex items-center justify-between mb-4">
        <button onClick={() => changeDate(-1)} className="w-10 h-10 flex items-center justify-center text-2xl text-primary active:opacity-60">‹</button>
        <div className="text-center">
          <input
            type="date"
            value={date}
            max={dayjs().format('YYYY-MM-DD')}
            onChange={e => setDate(e.target.value)}
            className="text-base font-semibold text-gray-800 bg-transparent text-center outline-none"
          />
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={date >= dayjs().format('YYYY-MM-DD')}
          className="w-10 h-10 flex items-center justify-center text-2xl text-primary active:opacity-60 disabled:opacity-30"
        >›</button>
      </div>

      {/* Platform inputs */}
      <div className="card mb-4 space-y-3">
        {loading ? (
          <div className="text-center py-6 text-gray-400">加载中...</div>
        ) : (
          platforms.map(platform => (
            <div key={platform} className="flex items-center justify-between gap-3">
              <span className="text-base text-gray-700 w-24 shrink-0">{platform}</span>
              <div className="flex items-center flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-gray-400 mr-1">¥</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={income[platform] ?? ''}
                  onChange={e => setIncome(prev => ({ ...prev, [platform]: e.target.value }))}
                  className="flex-1 bg-transparent outline-none text-right text-base text-gray-800"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="card mb-4">
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600">今日合计</span>
          <span className="text-xl font-bold text-primary">¥{dailyTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-t border-gray-50">
          <span className="text-gray-500 text-sm">本月累计到账</span>
          <span className="text-lg font-semibold text-gray-700">¥{monthlyTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Save button */}
      <button onClick={handleSave} className="btn-primary" disabled={saving || loading}>
        {saving ? '保存中...' : '保存收入'}
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
