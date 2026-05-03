import { WalletBalance } from '@/types/dashboard';

interface Props { balance: WalletBalance }

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function BalanceModule({ balance }: Props) {
  const positive = balance.changePercent >= 0;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: '10px',
      boxShadow: 'var(--shadow-card)',
      padding: '20px',
    }}>
      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px' }}>
        Total float
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '36px', fontWeight: 500, color: 'var(--myr)', letterSpacing: '-0.02em' }}>
          RM {fmt(balance.myrFloat)}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 500, color: positive ? 'var(--settled)' : 'var(--failed)' }}>
          {positive ? '↑' : '↓'} {Math.abs(balance.changePercent).toFixed(1)}%
        </span>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px', fontFamily: 'JetBrains Mono, monospace' }}>vs last month</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          { label: 'USDT held',        value: `${fmt(balance.usdtHeld)} USDT`, color: 'var(--usdt)' },
          { label: 'In transit',       value: `RM ${fmt(balance.inTransit)}`,  color: 'var(--pending)' },
          { label: 'Moved this month', value: `RM ${fmt(balance.totalMovedThisMonth)}`, color: 'var(--text-primary)' },
        ].map((sub) => (
          <div key={sub.label} style={{
            background: 'var(--raised)',
            border: '0.5px solid var(--border)',
            borderRadius: '7px',
            padding: '12px',
          }}>
            <p style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', marginBottom: '4px' }}>
              {sub.label}
            </p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: sub.color }}>
              {sub.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
