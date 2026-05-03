type Colour = 'default' | 'settled' | 'pending' | 'failed';

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  colour?: Colour;
}

const colourMap: Record<Colour, string> = {
  default: 'var(--text-primary)',
  settled: 'var(--settled)',
  pending: 'var(--pending)',
  failed:  'var(--failed)',
};

export function StatCard({ label, value, subtext, colour = 'default' }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: '10px',
      boxShadow: 'var(--shadow-card)',
      padding: '16px',
    }}>
      <p style={{
        fontSize: '10px', color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px',
      }}>
        {label}
      </p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '24px', fontWeight: 500, color: colourMap[colour] }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: '10px', color: 'var(--text-disabled)', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
