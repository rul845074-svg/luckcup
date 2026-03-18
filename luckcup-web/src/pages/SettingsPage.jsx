import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../constants/theme';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import { settingsApi } from '../services/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [editing, setEditing] = useState(null); // 当前正在编辑的字段名
  const [tempVal, setTempVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    settingsApi.get().then(setSettings);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const startEdit = (field, current) => {
    setEditing(field);
    setTempVal(typeof current === 'object' ? current.join('\n') : String(current));
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (editing === 'shopName') payload.shopName = tempVal.trim();
      if (editing === 'fixedRent') payload.fixedRent = parseFloat(tempVal) || 0;
      if (editing === 'platforms') payload.platforms = tempVal.split('\n').map(s => s.trim()).filter(Boolean);
      if (editing === 'expenseCategories') payload.expenseCategories = tempVal.split('\n').map(s => s.trim()).filter(Boolean);

      await settingsApi.update(payload);
      setSettings(prev => ({ ...prev, ...payload }));
      if (editing === 'shopName') localStorage.setItem('lc_shop_name', payload.shopName);
      setEditing(null);
      showToast('保存成功 ✓');
    } catch (e) {
      showToast('保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确认退出登录？')) {
      localStorage.removeItem('lc_token');
      localStorage.removeItem('lc_shop_id');
      localStorage.removeItem('lc_shop_name');
      navigate('/login');
    }
  };

  if (!settings) {
    return (
      <div>
        <PageHeader title="我的设置" />
        <div style={{ textAlign: 'center', padding: 40, color: C.textSec }}>加载中...</div>
      </div>
    );
  }

  const rows = [
    { key: 'shopName', icon: '🏪', label: '店铺名称', value: settings.shopName },
    { key: 'platforms', icon: '📱', label: '收入平台管理', value: `${settings.platforms.length} 个平台` },
    { key: 'expenseCategories', icon: '📂', label: '支出类别管理', value: `${settings.expenseCategories.length} 个类别` },
    { key: 'fixedRent', icon: '🏠', label: '固定房租', value: `¥${settings.fixedRent.toLocaleString()}/月` },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader title="我的设置" subtitle="管理店铺基础信息" />

      <div style={{ padding: '16px 16px 0' }}>
        <Card>
          {rows.map((item, i) => (
            <div key={item.key} onClick={() => startEdit(item.key, settings[item.key])} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 0', cursor: 'pointer',
              borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>{item.label}</span>
              <span style={{ fontSize: 14, color: C.textSec }}>{item.value}</span>
              <span style={{ fontSize: 14, color: '#CCC' }}>›</span>
            </div>
          ))}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <span style={{ fontSize: 22 }}>ℹ️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>关于系统</div>
              <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>LuckCup 运营助手 V1.0 · 腾讯云版</div>
            </div>
          </div>
        </Card>

        <button onClick={handleLogout} style={{
          width: '100%', padding: '14px 0', marginTop: 24,
          background: C.white, color: C.red,
          border: `1px solid ${C.red}`, borderRadius: 14,
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          退出登录
        </button>
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200,
        }} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{
            background: C.white, borderRadius: '20px 20px 0 0',
            padding: 24, width: '100%',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, color: C.text }}>
              {rows.find(r => r.key === editing)?.label}
            </h3>

            {['platforms', 'expenseCategories'].includes(editing) ? (
              <>
                <p style={{ fontSize: 13, color: C.textSec, marginBottom: 8 }}>每行一个名称</p>
                <textarea value={tempVal} onChange={e => setTempVal(e.target.value)} style={{
                  width: '100%', height: 160,
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '12px 14px', fontSize: 15, color: C.text,
                  background: C.bg, outline: 'none', resize: 'none',
                  boxSizing: 'border-box',
                }} />
              </>
            ) : (
              <input
                type={editing === 'fixedRent' ? 'number' : 'text'}
                value={tempVal}
                onChange={e => setTempVal(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  fontSize: 16, color: C.text, background: C.bg,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => setEditing(null)} style={{
                flex: 1, padding: '13px 0', background: C.white, color: C.textSec,
                border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 15, cursor: 'pointer',
              }}>取消</button>
              <button onClick={saveEdit} disabled={saving} style={{
                flex: 2, padding: '13px 0',
                background: saving ? '#ccc' : C.primaryGradient,
                color: C.white, border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

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
