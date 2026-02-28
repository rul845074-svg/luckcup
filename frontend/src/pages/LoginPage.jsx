import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', form);
      setAuth(data.token, data.refreshToken, data.user, data.shop);
      navigate('/income', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🧋</div>
        <h1 className="text-2xl font-bold text-primary">LuckCup 运营系统</h1>
        <p className="text-gray-500 text-sm mt-1">加盟商专属管理工具</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">邮箱</label>
          <input
            type="email"
            className="input-field"
            placeholder="请输入邮箱"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">密码</label>
          <input
            type="password"
            className="input-field"
            placeholder="请输入密码"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
        </div>

        {error && (
          <p className="text-loss text-sm text-center">{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        还没有账号？{' '}
        <Link to="/register" className="text-primary font-medium">立即注册</Link>
      </p>
    </div>
  );
}
