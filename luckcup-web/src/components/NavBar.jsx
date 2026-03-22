import { useLocation, useNavigate } from 'react-router-dom';
import { C } from '../constants/theme';

const TABS = [
  { path: '/income', icon: '💰', label: '今日收入' },
  { path: '/expense', icon: '📝', label: '记支出' },
  { path: '/backend', icon: '📥', label: '后台补录' },
  { path: '/overview', icon: '📊', label: '月度总览' },
  { path: '/analysis', icon: '📈', label: '盈亏分析' },
  { path: '/settings', icon: '⚙️', label: '设置' },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 72,
      background: C.white, borderTop: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      paddingBottom: 8, zIndex: 100,
    }}>
      {TABS.map(t => {
        const active = location.pathname === t.path;
        return (
          <button key={t.path} onClick={() => navigate(t.path)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '4px 0', minWidth: 48,
          }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: active ? 700 : 400,
              color: active ? C.primary : C.textSec,
            }}>{t.label}</span>
            {active && (
              <div style={{
                width: 20, height: 3, borderRadius: 2,
                background: C.primaryGradient, marginTop: 1,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
