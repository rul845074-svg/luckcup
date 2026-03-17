import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { api } from '../utils/api';

export default function ProfitPage() {
  const currentMonth = dayjs().format('YYYY-MM');
  const [month, setMonth] = useState(currentMonth);
  const [profit, setProfit] = useState(null);
  const [breakeven, setBreakeven] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, b] = await Promise.all([
        api.get(`/analysis/profit?month=${month}`),
        api.get(`/analysis/breakeven?month=${month}`),
      ]);
      setProfit({ ...p, platformContributions: p.platformContributions || [] });
      setBreakeven(b);
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
      <h1 className="text-xl font-bold text-gray-800 mb-4">盈亏分析</h1>

      {/* Month nav */}
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
      {error && <div className="text-center py-8 text-loss">{error}</div>}

      {profit && (
        <>
          {/* Big profit/loss display */}
          <div className={`rounded-2xl p-6 mb-4 text-center ${profit.isProfit ? 'bg-profit/10' : 'bg-loss/10'}`}>
            <p className="text-gray-500 text-sm mb-2">{profit.isProfit ? '本月盈利' : '本月亏损'}</p>
            <p className={`text-5xl font-bold ${profit.isProfit ? 'text-profit' : 'text-loss'}`}>
              {profit.isProfit ? '+' : ''}¥{(profit.profit ?? 0).toFixed(2)}
            </p>
            <p className={`text-lg mt-2 font-medium ${profit.isProfit ? 'text-profit' : 'text-loss'}`}>
              利润率 {profit.profitRate ?? 0}%
            </p>
            <div className="flex justify-center gap-8 mt-4 text-sm text-gray-600">
              <div>
                <p className="text-gray-400">总收入</p>
                <p className="font-semibold">¥{(profit.totalIncome ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">总支出</p>
                <p className="font-semibold">¥{(profit.totalExpense ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Platform contributions */}
          {profit.platformContributions.length > 0 && (
            <div className="card mb-4">
              <h2 className="font-semibold text-gray-700 mb-3">各平台利润贡献</h2>
              <div className="space-y-3">
                {profit.platformContributions
                  .sort((a, b) => b.income - a.income)
                  .map(item => (
                    <div key={item.platform} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-700">{item.platform}</p>
                        <p className="text-xs text-gray-400">到账 ¥{(item.income ?? 0).toFixed(2)}</p>
                      </div>
                      <p className={`font-bold ${(item.profit ?? 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {(item.profit ?? 0) >= 0 ? '+' : ''}¥{(item.profit ?? 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {breakeven && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">盈亏平衡点</h2>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>当月进度（第{breakeven.currentDay || 0}天）</span>
              <span className={breakeven.isOnTrack ? 'text-profit' : 'text-loss'}>
                {breakeven.progressRate || 0}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${breakeven.isOnTrack ? 'bg-profit' : 'bg-loss'}`}
                style={{ width: `${Math.min(breakeven.progressRate || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>已到账 ¥{(breakeven.currentIncome ?? 0).toFixed(2)}</span>
              <span>应达 ¥{(breakeven.expectedByNow ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Threshold */}
          <div className="bg-orange-50 rounded-xl p-3 mb-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">每月至少到账</span>
              <span className="font-bold text-primary">¥{(breakeven.breakevenMonthly ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-sm text-gray-600">每天至少到账</span>
              <span className="font-bold text-primary">¥{(breakeven.breakevenDaily ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Cost breakdown */}
          <h3 className="text-sm font-medium text-gray-600 mb-2">成本构成（保本线依据）</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>固定房租</span>
              <span>¥{(breakeven.costBreakdown?.fixedRent ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>工资</span>
              <span>¥{(breakeven.costBreakdown?.laborCost ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>水电</span>
              <span>¥{(breakeven.costBreakdown?.utilityCost ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>采购（近3月均值）</span>
              <span>¥{(breakeven.costBreakdown?.avgPurchaseCost ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
