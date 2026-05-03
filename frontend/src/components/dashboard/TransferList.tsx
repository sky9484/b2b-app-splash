import { Transfer, TransferStatus } from '@/types/dashboard';
import { Button } from '@/components/ui/button';

interface Props { transfers: Transfer[] }

const statusConfig: Record<TransferStatus, { label: string; bg: string; text: string; border: string }> = {
  settled:           { label: 'Completed',  bg: 'var(--settled-bg)',    text: 'var(--settled)',    border: 'var(--settled-border)' },
  pending:           { label: 'Pending',    bg: 'var(--pending-bg)',    text: 'var(--pending)',    border: 'var(--pending-border)' },
  processing:        { label: 'Processing', bg: 'var(--processing-bg)', text: 'var(--processing)', border: 'var(--processing-border)' },
  failed:            { label: 'Failed',     bg: 'var(--failed-bg)',     text: 'var(--failed)',     border: 'var(--failed-border)' },
  settlement_pending:{ label: 'Queued',     bg: 'var(--pending-bg)',    text: 'var(--pending)',    border: 'var(--pending-border)' },
  exchange_failed:   { label: 'Ex. Failed', bg: 'var(--failed-bg)',     text: 'var(--failed)',     border: 'var(--failed-border)' },
};

const fallbackStatus = { label: 'Unknown', bg: 'var(--raised)', text: 'var(--text-tertiary)', border: 'var(--border)' };

function initials(name: string): string {
  return (name || '').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function TransferList({ transfers }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Recent transfers</h2>
        <Button variant="ghost-splash" size="sm" asChild>
          <a href="/transfers" style={{ textDecoration: 'none' }}>View all</a>
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {transfers.length === 0 && (
          <div style={{
            padding: '32px', textAlign: 'center',
            color: 'var(--text-tertiary)', fontSize: '13px',
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: '10px', boxShadow: 'var(--shadow-card)',
          }}>
            No transfers yet
          </div>
        )}
        {transfers.map((tx) => {
          const s = statusConfig[tx.status] ?? fallbackStatus;
          return (
            <div
              key={tx.id}
              className="interactive-row"
              style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--active)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                color: 'var(--text-secondary)', fontWeight: 500,
              }}>
                {initials(tx.recipientName)}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.recipientName}
                </p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {new Date(tx.createdAt).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{tx.reference}
                </p>
              </div>

              {/* Amount + status */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500, color: 'var(--myr)' }}>
                  −RM {(tx.amountMYR ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </p>
                <span style={{
                  display: 'inline-block',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                  padding: '2px 8px', borderRadius: '5px',
                  border: `0.5px solid ${s.border}`,
                  background: s.bg, color: s.text,
                  marginTop: '4px',
                }}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
