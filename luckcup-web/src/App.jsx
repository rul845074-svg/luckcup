import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import OverviewPage from './pages/OverviewPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';

function RequireAuth({ children }) {
  const token = localStorage.getItem('lc_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100vh' }}>
      {children}
      <NavBar />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/income" element={
        <RequireAuth><AppLayout><IncomePage /></AppLayout></RequireAuth>
      } />
      <Route path="/expense" element={
        <RequireAuth><AppLayout><ExpensePage /></AppLayout></RequireAuth>
      } />
      <Route path="/overview" element={
        <RequireAuth><AppLayout><OverviewPage /></AppLayout></RequireAuth>
      } />
      <Route path="/analysis" element={
        <RequireAuth><AppLayout><AnalysisPage /></AppLayout></RequireAuth>
      } />
      <Route path="/settings" element={
        <RequireAuth><AppLayout><SettingsPage /></AppLayout></RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/income" replace />} />
    </Routes>
  );
}
