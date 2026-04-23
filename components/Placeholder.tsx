import { shade } from '@/lib/utils';

interface Props {
  color: string;
  hint?: string;
  rounded?: string;
}

export default function Placeholder({ color, hint, rounded = 'var(--radius-md)' }: Props) {
  const stripe = `repeating-linear-gradient(135deg, ${color} 0 14px, ${shade(color, -0.05)} 14px 28px)`;
  return (
    <div style={{ position: 'absolute', inset: 0, background: stripe, borderRadius: rounded }}>
      {hint && (
        <div style={{
          position: 'absolute', left: 14, top: 14,
          background: 'rgba(14,14,14,0.65)', color: 'var(--bg)',
          padding: '4px 10px', borderRadius: 999,
          fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.12em',
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
