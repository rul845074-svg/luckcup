import { C } from '../constants/theme';

export default function Card({ children, style }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 16,
      boxShadow: C.shadow,
      border: `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}
