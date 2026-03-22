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

function shortDate(d) {
  const dt = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

// 按日期分组
function groupByDate(items) {
  const groups = {};
  for (const item of items) {
    const d = String(item.date).slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function IncomePage() {
  const [date, setDate] = useState(todayStr());
  const [platforms, setPlatforms] = useState([]);
  const [values, setValues] = useState({});
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyDetails, setMonthlyDetails] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [toast, setToast] = useState('');
  const month = date.slice(0, 7);

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

  const refreshDetails = () => {
    setLoadingDetails(true);
    incomeApi.getMonthlyDetails(month)
      .then(data => setMonthlyDetails(data.items || []))
      .catch(() => setMonthlyDetails([]))
      .finally(() => setLoadingDetails(false));
  };

  useEffect(() => {
    refreshDetails();
  }, [month]);

  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = platforms.map(p => ({ platform: p, amount: Number(values[p]) || 0 }));
      await incomeApi.saveDaily(date, items);
      showToast('保存成功');
      refreshDetails();
      // 刷新月度累计
      incomeApi.getDaily(date).then(data => {
        setMonthlyTotal(data.monthlyTotal || 0);
      });
    } catch (e) {
      showToast('保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除这条收入记录？')) return;
    try {
      await incomeApi.remove(id);
      showToast('已删除');
      refreshDetails();
      // 刷新当天数据和月度累计
      incomeApi.getDaily(date).then(data => {
        const map = {};
        platforms.forEach(p => { map[p] = 0; });
        data.items.forEach(item => { map[item.platform] = item.amount; });
        setValues(map);
        setMonthlyTotal(data.monthlyTotal || 0);
      });
    } catch (e) {
      showToast('删除失败');
    }
  };

  const jumpToDate = (targetDate) => {
    setDate(String(targetDate).slice(0, 10));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const grouped = groupByDate(monthlyDetails);

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

        {/* 本月收入明细 - 按日期分组 */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>本月收入明细</span>
            <span style={{ fontSize: 12, color: C.textSec }}>{month}</span>
          </div>
          {loadingDetails && (
            <p style={{ fontSize: 13, color: C.textSec, textAlign: 'center', padding: '12px 0' }}>
              明细加载中...
            </p>
          )}
          {!loadingDetails && monthlyDetails.length === 0 && (
            <p style={{ fontSize: 13, color: C.textSec, textAlign: 'center', padding: '12px 0' }}>
              本月暂无收入明细
            </p>
          )}
          {!loadingDetails && grouped.map(([groupDate, items]) => {
            const dayTotal = items.reduce((s, it) => s + Number(it.amount), 0);
            const isCurrentDate = groupDate === date;
            return (
              <div key={groupDate} style={{ marginBottom: 8 }}>
                {/* 日期分组头 */}
                <div
                  onClick={() => jumpToDate(groupDate)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', marginBottom: 4,
                    background: isCurrentDate ? C.primaryLight : C.bg,
                    borderRadius: 8, cursor: 'pointer',
                    border: isCurrentDate ? `1px solid ${C.primary}` : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: isCurrentDate ? C.primary : C.text }}>
                    {shortDate(groupDate)}
                    {isCurrentDate && <span style={{ fontSize: 11, marginLeft: 6, color: C.primary }}>编辑中</span>}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                    ¥{dayTotal.toLocaleString()}
                  </span>
                </div>
                {/* 该日期下的各平台记录 */}
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 4px',
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: `${PLATFORM_COLORS[platforms.indexOf(item.platform) >= 0 ? platforms.indexOf(item.platform) % PLATFORM_COLORS.length : 0]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {PLATFORM_ICONS[item.platform] || item.platform.slice(0, 1)}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, color: C.text }}>{item.platform}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.green, flexShrink: 0 }}>
                      +¥{Number(item.amount).toLocaleString()}
                    </span>
                    <button
                      onClick={() => jumpToDate(item.date)}
                      style={iconBtn}
                      title="跳转编辑"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={iconBtn}
                      title="删除"
                    >🗑️</button>
                  </div>
                ))}
              </div>
            );
          })}
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

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, padding: '2px 4px', lineHeight: 1,
};
