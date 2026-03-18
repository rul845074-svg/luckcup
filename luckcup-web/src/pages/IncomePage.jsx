import { useState, useEffect } from 'react';
import { C, PLATFORM_COLORS, PLATFORM_ICONS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { incomeApi, settingsApi } from '../services/api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

export default function IncomePage() {
  const [date, setDate] = useState(todayStr());
  const [platforms, setPlatforms] = useState([]);
  const [values, setValues] = useState({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    settingsApi.get().then(s => {
      setPlatforms(s.platforms);
      const init = {};
      s.platforms.forEach(p => { init[p] = 0; });
      setValues(init);
    });
  }, []);

  useEffect(() => {
    if (!platforms.length) return;
    incomeApi.getDaily(date).then(data => {
      const map = {};
      platforms.forEach(p => { map[p] = 0; });
      data.items.forEach(item => { map[item.platform] = item.amount; });
      setValues(map);
      setMonthlyTotal(data.monthlyTotal || 0);
    });
  }, [date, platforms]);

  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = platforms.map(p => ({ platform: p, amount: Number(values[p]) || 0 }));
      await incomeApi.saveDaily(date, items);
      showToast('保存成功 ✓');
      // 更新月度累计
      setMonthlyTotal(prev => {
        // 粗略更新（真实联调后会刷新）
        return prev;
      });
    } catch (e) {
      showToast('保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const changeDate = (delta) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="今日收入" subtitle={formatDate(date)} />

      {/* 日期切换 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 16px 0' }}>
        <button onClick={() => changeDate(-1)} style={arrowBtn}>‹</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ border: 'none', background: 'transparent', fontSize: 14, color: C.textSec, cursor: 'pointer' }} />
        <button onClick={() => changeDate(1)} disabled={date >= todayStr()} style={{ ...arrowBtn, opacity: date >= todayStr() ? 0.3 : 1 }}>›</button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <Card>
          {platforms.map((p, i) => (
            <div key={p} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < platforms.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${PLATFORM_COLORS[i % PLATFORM_COLORS.length]}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {PLATFORM_ICONS[p] || p.slice(0, 1)}
              </div>
              <span style={{ flex: 1, fontSize: 15, color: C.text, fontWeight: 500 }}>{p}</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 2,
                background: C.bg, borderRadius: 10, padding: '8px 12px',
                border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 14, color: C.textSec }}>¥</span>
                <input
                  type="number" inputMode="decimal" min="0"
                  value={values[p] || ''}
                  onChange={e => setValues({ ...values, [p]: e.target.value })}
                  placeholder="0"
                  style={{
                    border: 'none', background: 'transparent', width: 70,
                    fontSize: 16, fontWeight: 600, color: C.text,
                    outline: 'none', textAlign: 'right',
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: C.textSec }}>今日合计</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.green }}>
              ¥{total.toLocaleString()}
            </span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 13, color: C.textSec }}>本月累计到账</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>
              ¥{monthlyTotal.toLocaleString()}
            </span>
          </div>
        </Card>

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px 0', marginTop: 16,
          background: saving ? '#ccc' : C.primaryGradient,
          color: C.white, border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saving ? 'none' : '0 4px 14px rgba(232,89,12,0.3)',
          letterSpacing: 1,
        }}>
          {saving ? '保存中...' : '保 存'}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.75)', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontSize: 15, zIndex: 999,
        }}>{toast}</div>
      )}
    </div>
  );
}

const arrowBtn = {
  background: 'none', border: `1px solid #E0D5CA`,
  borderRadius: 8, width: 32, height: 32,
  fontSize: 18, cursor: 'pointer', color: '#8C7B6B',
};
