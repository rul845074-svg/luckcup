import { C } from '../constants/theme';

export default function PageHeader({ title, subtitle }) {
  return (
    <div style={{
      background: C.primaryGradient,
      padding: '20px 20px 24px',
      color: C.white,
      borderRadius: '0 0 24px 24px',
    }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>{subtitle}</p>
      )}
    </div>
  );
}
