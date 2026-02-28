import { Outlet, NavLink } from 'react-router-dom';

const tabs = [
  { to: '/income',   label: '今日收入', icon: '💰' },
  { to: '/expense',  label: '记支出',   icon: '📝' },
  { to: '/overview', label: '月度总览', icon: '📊' },
  { to: '/profit',   label: '盈亏分析', icon: '📈' },
  { to: '/settings', label: '设置',     icon: '⚙️' },
];

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-md mx-auto">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex safe-area-bottom z-50">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `tab-item flex-1 ${isActive ? 'active' : ''}`
            }
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
