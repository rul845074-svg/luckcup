import { useState, useEffect } from 'react';
import { C, PLATFORM_COLORS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { analysisApi } from '../services/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function changeMonth(month, delta) {
  const [yr, mo] = month.split('-').map(Number);
  const d = new Date(yr, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function OverviewPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    analysisApi.getOverview(month).then(setData);
  }, [month]);

  if (!data) {
    return (
      <div>
        <PageHeader title="月度总览" subtitle={`${month} 加载中...`} />
        <div style={{ textAlign: 'center', padding: 40, color: C.textSec }}>加载中...</div>
      </div>
    );
  }

  const { totalIncome, totalExpense, balance, incomeByPlatform, expenseByCategory } = data;
  const isProfit = balance >= 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="月度总览" subtitle={`${month}`} />

      {/* 月份切换 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '12px 16px 0' }}>
        <button onClick={() => setMonth(m => changeMonth(m, -1))} style={arrowBtn}>‹ 上月</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{month}</span>
        <button onClick={() => setMonth(m => changeMonth(m, 1))} disabled={month >= currentMonth()} style={{ ...arrowBtn, opacity: month >= currentMonth() ? 0.3 : 1 }}>下月 ›</button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* 结余卡片 */}
        <Card style={{
          background: isProfit ? C.greenBg : C.redBg,
          border: `1px solid ${isProfit ? '#A5D6A7' : '#FFCDD2'}`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 4px' }}>本月结余</p>
            <span style={{ fontSize: 36, fontWeight: 800, color: isProfit ? C.green : C.red }}>
              {isProfit ? '' : '-'}¥{Math.abs(balance).toLocaleString()}
            </span>
            <p style={{ fontSize: 12, color: C.textSec, margin: '4px 0 0' }}>
              {isProfit ? '✅ 盈利中' : '❌ 亏损中'}
            </p>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-around', marginTop: 16,
            paddingTop: 12, borderTop: `1px dashed ${isProfit ? '#A5D6A7' : '#FFCDD2'}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: C.textSec, margin: 0 }}>总收入</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: '4px 0 0' }}>
                ¥{totalIncome.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: C.textSec, margin: 0 }}>总支出</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.red, margin: '4px 0 0' }}>
                ¥{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* 收入构成 */}
        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>📥 收入构成</p>
          {incomeByPlatform.length === 0 && (
            <p style={{ fontSize: 13, color: C.textSec }}>本月暂无收入记录</p>
          )}
          {incomeByPlatform.map((p, i) => (
            <div key={p.platform} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{p.platform}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>¥{p.amount.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, background: '#F0E6DC', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.percentage}%`, borderRadius: 4, background: PLATFORM_COLORS[i % PLATFORM_COLORS.length] }} />
              </div>
              <span style={{ fontSize: 11, color: C.textSec }}>{p.percentage}%</span>
            </div>
          ))}
        </Card>

        {/* 支出构成 */}
        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>📤 支出构成</p>
          {expenseByCategory.length === 0 && (
            <p style={{ fontSize: 13, color: C.textSec }}>本月暂无支出记录</p>
          )}
          {expenseByCategory.map((e, i) => (
            <div key={e.category} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{e.category}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>¥{e.amount.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, background: '#F0E6DC', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${e.percentage}%`, borderRadius: 4, background: PLATFORM_COLORS[i % PLATFORM_COLORS.length] }} />
              </div>
              <span style={{ fontSize: 11, color: C.textSec }}>{e.percentage}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const arrowBtn = {
  background: 'none', border: `1px solid #E0D5CA`, borderRadius: 8,
  padding: '6px 10px', fontSize: 13, cursor: 'pointer', color: '#8C7B6B',
};
