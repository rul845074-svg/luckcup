import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { api } from '../utils/api';

function ProgressBar({ pct, color = 'bg-primary' }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function OverviewPage() {
  const currentMonth = dayjs().format('YYYY-MM');
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analysis/monthly-overview?month=${month}`);
      setData({
        ...res,
        platformBreakdown: res.platformBreakdown || [],
        categoryBreakdown: res.categoryBreakdown || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const changeMonth = (delta) => {
    setMonth(dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM'));
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">月度总览</h1>

      {/* Month navigation */}
      <div className="card flex items-center justify-between mb-4">
        <button onClick={() => changeMonth(-1)} className="w-10 h-10 flex items-center justify-center text-2xl text-primary">‹</button>
        <span className="font-semibold text-gray-700">{month}</span>
        <button
          onClick={() => changeMonth(1)}
          disabled={month >= currentMonth}
          className="w-10 h-10 flex items-center justify-center text-2xl text-primary disabled:opacity-30"
        >›</button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400">加载中...</div>}
      {error && <div className="text-center py-8 text-loss text-sm">{error}</div>}

      {data && (
        <>
          {/* Balance card */}
          <div
            className={`rounded-2xl p-5 mb-4 text-white ${data.isProfit
              ? 'bg-gradient-to-br from-profit to-green-400'
              : 'bg-gradient-to-br from-loss to-red-400'}`}
          >
            <p className="text-sm opacity-80 mb-1">本月结余</p>
            <p className="text-4xl font-bold">
              {data.isProfit ? '+' : ''}¥{(data.balance ?? 0).toFixed(2)}
            </p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <p className="opacity-70">总收入</p>
                <p className="font-semibold">¥{(data.totalIncome ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="opacity-70">总支出</p>
                <p className="font-semibold">¥{(data.totalExpense ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Income breakdown */}
          <div className="card mb-4">
            <h2 className="font-semibold text-gray-700 mb-3">收入构成</h2>
            {data.platformBreakdown.length === 0 && (
              <p className="text-gray-400 text-sm">暂无数据</p>
            )}
            <div className="space-y-3">
              {data.platformBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map(item => (
                  <div key={item.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.platform}</span>
                      <span className="font-medium">¥{(item.amount ?? 0).toFixed(2)} <span className="text-gray-400">({item.percentage ?? 0}%)</span></span>
                    </div>
                    <ProgressBar pct={item.percentage ?? 0} color="bg-primary" />
                  </div>
                ))}
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">支出构成</h2>
            {data.categoryBreakdown.length === 0 && (
              <p className="text-gray-400 text-sm">暂无数据</p>
            )}
            <div className="space-y-3">
              {data.categoryBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map(item => (
                  <div key={item.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-medium">¥{(item.amount ?? 0).toFixed(2)} <span className="text-gray-400">({item.percentage ?? 0}%)</span></span>
                    </div>
                    <ProgressBar pct={item.percentage ?? 0} color="bg-accent" />
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
