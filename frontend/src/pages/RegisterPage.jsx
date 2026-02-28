import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', shopName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-6">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🧋</div>
        <h1 className="text-2xl font-bold text-primary">创建账号</h1>
        <p className="text-gray-500 text-sm mt-1">开始管理你的 LuckCup 门店</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">店铺名称</label>
          <input
            type="text"
            className="input-field"
            placeholder="例如：LuckCup 万达店"
            value={form.shopName}
            onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
            required
          />
        </div>
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
          <label className="block text-sm font-medium text-gray-600 mb-1.5">密码（至少6位）</label>
          <input
            type="password"
            className="input-field"
            placeholder="请设置密码"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
        </div>

        {error && <p className="text-loss text-sm text-center">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        已有账号？{' '}
        <Link to="/login" className="text-primary font-medium">去登录</Link>
      </p>
    </div>
  );
}
