import { useState, useEffect } from 'react';
import { C, BACKEND_INCOME_ICONS, BACKEND_EXPENSE_ICONS } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { backendEntriesApi } from '../services/api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BackendEntryPage() {
  const [type, setType] = useState('income');
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editItem, setEditItem] = useState(null);

  const loadEntries = () => {
    backendEntriesApi.getList(currentMonth()).then(data => setEntries(data.entries));
  };

  useEffect(() => {
    backendEntriesApi.getCategories().then(setCategories);
    loadEntries();
  }, []);

  const currentCategories = type === 'income' ? categories.income : categories.expense;
  const icons = type === 'income' ? BACKEND_INCOME_ICONS : BACKEND_EXPENSE_ICONS;

  const handleSave = async () => {
    if (!selected) { showToast('请选择类别'); return; }
    if (!amount || Number(amount) <= 0) { showToast('请输入有效金额'); return; }

    setSaving(true);
    try {
      if (editItem) {
        await backendEntriesApi.update(editItem.id, { date, type, category: selected, amount: Number(amount), note });
        showToast('修改成功 ✓');
        setEditItem(null);
      } else {
        await backendEntriesApi.add({ date, type, category: selected, amount: Number(amount), note });
        showToast('保存成功 ✓');
      }
      setSelected(null); setAmount(''); setNote(''); setDate(todayStr());
      loadEntries();
    } catch (e) {
      showToast('操作失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除这条记录？')) return;
    try {
      await backendEntriesApi.remove(id);
      showToast('已删除');
      loadEntries();
    } catch (e) {
      showToast('删除失败');
    }
  };

  const startEdit = (item) => {
    setEditItem(item);
    setType(item.type);
    setSelected(item.category);
    setAmount(String(item.amount));
    setNote(item.note || '');
    setDate(item.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title={editItem ? '编辑后台条目' : '后台补录'} subtitle="调货、转卖、营业外等账目" />

      <div style={{ padding: '16px 16px 0' }}>
        {/* 收入/支出切换 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['income', 'expense'].map(t => (
            <button key={t} onClick={() => { setType(t); setSelected(null); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 15, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: type === t ? (t === 'income' ? C.greenBg : C.redBg) : C.bg,
              color: type === t ? (t === 'income' ? C.green : C.red) : C.textSec,
            }}>
              {t === 'income' ? '后台收入' : '后台支出'}
            </button>
          ))}
        </div>

        {/* 类别选择 */}
        <Card>
          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 12px' }}>选择类别</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {currentCategories.map(c => (
              <button key={c} onClick={() => setSelected(c)} style={{
                padding: '14px 8px',
                border: `2px solid ${selected === c ? C.primary : C.border}`,
                borderRadius: 14, cursor: 'pointer',
                background: selected === c ? C.primaryLight : C.white,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 24 }}>{icons[c] || '📋'}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: selected === c ? 700 : 500,
                  color: selected === c ? C.primary : C.text,
                }}>{c}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* 金额和备注 */}
        <Card style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 8px' }}>日期</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              border: `1px solid ${C.border}`, borderRadius: 12,
              fontSize: 15, color: C.text, background: C.bg,
              outline: 'none', marginBottom: 16, boxSizing: 'border-box',
            }} />

          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 8px' }}>金额</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: C.bg, borderRadius: 12, padding: '12px 16px',
            border: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.textSec }}>¥</span>
            <input type="number" inputMode="decimal" min="0.01" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" style={{
                border: 'none', background: 'transparent', flex: 1,
                fontSize: 28, fontWeight: 700, color: C.text, outline: 'none',
              }} />
          </div>

          <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 8px' }}>备注（选填）</p>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="可选：记录这笔账的来源..." style={{
              width: '100%', minHeight: 60,
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '12px 16px', fontSize: 15, color: C.text,
              background: C.bg, outline: 'none', resize: 'none',
              boxSizing: 'border-box',
            }} />
        </Card>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {editItem && (
            <button onClick={() => { setEditItem(null); setSelected(null); setAmount(''); setNote(''); }} style={{
              flex: 1, padding: '14px 0', background: C.white, color: C.textSec,
              border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 15, cursor: 'pointer',
            }}>取消</button>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            flex: editItem ? 2 : 1, padding: '14px 0',
            background: saving ? '#ccc' : C.primaryGradient, color: C.white,
            border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(232,89,12,0.3)',
          }}>
            {saving ? '保存中...' : (editItem ? '确认修改' : '保存')}
          </button>
        </div>

        {/* 本月条目列表 */}
        <Card style={{ marginTop: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>
            本月后台记录
          </p>
          {entries.length === 0 && (
            <p style={{ fontSize: 13, color: C.textSec, textAlign: 'center', padding: '16px 0' }}>
              暂无后台记录
            </p>
          )}
          {entries.map((e, i) => {
            const isIncome = e.type === 'income';
            const allIcons = { ...BACKEND_INCOME_ICONS, ...BACKEND_EXPENSE_ICONS };
            return (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: isIncome ? C.greenBg : C.redBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {allIcons[e.category] || '📋'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {e.category}
                    <span style={{ fontSize: 11, color: C.textSec, marginLeft: 4 }}>
                      {isIncome ? '收入' : '支出'}
                    </span>
                  </div>
                  {e.note && (
                    <div style={{ fontSize: 12, color: C.textSec, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.note}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isIncome ? C.green : C.red }}>
                    {isIncome ? '+' : '-'}¥{Number(e.amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{String(e.date).slice(5)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => startEdit(e)} style={iconBtn}>✏️</button>
                  <button onClick={() => handleDelete(e.id)} style={iconBtn}>🗑️</button>
                </div>
              </div>
            );
          })}
        </Card>
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

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 16, padding: '2px 4px', lineHeight: 1,
};
