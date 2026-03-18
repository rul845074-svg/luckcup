import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../constants/theme';
import { authApi } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!phone || !password) {
      setError('手机号和密码不能为空');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await authApi.register(phone, password, shopName || undefined);
      } else {
        res = await authApi.login(phone, password);
      }
      localStorage.setItem('lc_token', res.token);
      localStorage.setItem('lc_shop_id', res.shopId || '');
      localStorage.setItem('lc_shop_name', res.shopName || '');
      navigate('/income');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: C.primaryGradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 12px',
          boxShadow: '0 8px 24px rgba(232,89,12,0.3)',
        }}>☕</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>LuckCup</h1>
        <p style={{ fontSize: 13, color: C.textSec, margin: '4px 0 0' }}>运营助手</p>
      </div>

      {/* 表单卡片 */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: C.white, borderRadius: 20,
        padding: 24, boxShadow: C.shadowLg,
        border: `1px solid ${C.border}`,
      }}>
        {/* 切换登录/注册 */}
        <div style={{ display: 'flex', marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '10px 0',
              background: mode === m ? C.primaryGradient : C.white,
              color: mode === m ? C.white : C.textSec,
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: mode === m ? 700 : 400,
            }}>
              {m === 'login' ? '登录' : '注册新账号'}
            </button>
          ))}
        </div>

        {/* 输入框 */}
        {[
          { label: '手机号', value: phone, onChange: setPhone, type: 'tel', placeholder: '请输入手机号' },
          { label: '密码', value: password, onChange: setPassword, type: 'password', placeholder: mode === 'register' ? '至少 6 位' : '请输入密码' },
          ...(mode === 'register' ? [{ label: '店铺名称', value: shopName, onChange: setShopName, type: 'text', placeholder: '选填，如：LuckCup 万达店' }] : []),
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: C.textSec, display: 'block', marginBottom: 6 }}>
              {field.label}
            </label>
            <input
              type={field.type}
              value={field.value}
              onChange={e => field.onChange(e.target.value)}
              placeholder={field.placeholder}
              style={{
                width: '100%', padding: '12px 14px',
                border: `1px solid ${C.border}`, borderRadius: 12,
                fontSize: 15, color: C.text, background: C.bg,
                outline: 'none',
              }}
            />
          </div>
        ))}

        {error && (
          <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0',
            background: loading ? '#ccc' : C.primaryGradient,
            color: C.white, border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(232,89,12,0.3)',
          }}
        >
          {loading ? '请稍候...' : (mode === 'login' ? '登 录' : '注 册')}
        </button>
      </div>
    </div>
  );
}
