import { useState, useEffect } from 'react';
import { C, PLATFORM_COLORS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { analysisApi } from '../services/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AnalysisPage() {
  const [month] = useState(currentMonth());
  const [overview, setOverview] = useState(null);
  const [breakeven, setBreakeven] = useState(null);

  useEffect(() => {
    analysisApi.getOverview(month).then(setOverview);
    analysisApi.getBreakeven(month).then(setBreakeven);
  }, [month]);

  if (!overview || !breakeven) {
    return (
      <div>
        <PageHeader title="盈亏分析" subtitle="加载中..." />
        <div style={{ textAlign: 'center', padding: 40, color: C.textSec }}>加载中...</div>
      </div>
    );
  }

  const { totalIncome, totalExpense, balance, incomeByPlatform } = overview;
  const profitRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0.0';
  const isProfit = balance >= 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="盈亏分析" subtitle={`${month} · 核心数据`} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* 盈亏结果大卡片 */}
        <Card style={{ background: C.primaryGradient, border: 'none', color: C.white, textAlign: 'center' }}>
          <p style={{ fontSize: 13, margin: '0 0 4px', opacity: 0.85 }}>本月盈亏</p>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, fontFamily: 'monospace' }}>
            {isProfit ? '+' : ''}{`¥${balance.toLocaleString()}`}
          </div>
          <p style={{ fontSize: 14, margin: '4px 0 0', opacity: 0.9 }}>
            利润率 {profitRate}% {isProfit ? '✅' : '❌'}
          </p>
        </Card>

        {/* 各平台利润贡献 */}
        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>📊 各平台利润贡献</p>
          <div style={{
            fontSize: 12, color: C.textSec, marginBottom: 12,
            padding: '8px 12px', background: C.primaryLight, borderRadius: 8,
          }}>
            💡 V1版本按到账占比等比例分摊成本，各平台利润率相同
          </div>
          {incomeByPlatform.map((p, i) => {
            const cost = totalIncome > 0 ? Math.round(totalExpense * (p.amount / totalIncome)) : 0;
            const profit = p.amount - cost;
            return (
              <div key={p.platform} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.platform}</div>
                  <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>
                    到账 ¥{p.amount.toLocaleString()} · 成本 ¥{cost.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>
                    {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{profitRate}%</div>
                </div>
              </div>
            );
          })}
        </Card>

        {/* 盈亏平衡点 */}
        <Card style={{ marginTop: 12, border: `2px solid ${C.primary}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.primary, margin: 0 }}>盈亏平衡点</p>
          </div>
          <p style={{ fontSize: 12, color: C.textSec, margin: '0 0 12px' }}>基于当前设置动态计算</p>

          {[
            { label: '固定成本（房租）', val: breakeven.fixedRent },
            { label: '人力成本（工资）', val: breakeven.salary },
            { label: '水电成本', val: breakeven.utility },
            { label: '采购成本（近3月均值）', val: breakeven.purchaseCost },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', fontSize: 14,
            }}>
              <span style={{ color: C.textSec }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: C.text }}>¥{item.val.toLocaleString()}</span>
            </div>
          ))}

          <div style={{
            marginTop: 12, paddingTop: 12,
            borderTop: `2px dashed ${C.primary}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 13, color: C.textSec }}>每月至少到账</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>
                ¥{breakeven.breakevenTotal.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: C.textSec }}>每天至少到账</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>
                ¥{breakeven.dailyBreakeven.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 12,
            background: breakeven.surplus >= 0 ? C.greenBg : C.redBg,
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: breakeven.surplus >= 0 ? C.green : C.red }}>
              {breakeven.surplus >= 0
                ? `本月已到账 ¥${totalIncome.toLocaleString()}，超过平衡点 ¥${Math.abs(breakeven.surplus).toLocaleString()} 👍`
                : `本月已到账 ¥${totalIncome.toLocaleString()}，距平衡点还差 ¥${Math.abs(breakeven.surplus).toLocaleString()} ⚠️`
              }
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
