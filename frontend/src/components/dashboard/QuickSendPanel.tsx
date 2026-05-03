import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FxQuote } from '@/types/dashboard';
import api from '@/lib/api';

function formatAmount(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, '');
  const [int, dec] = digits.split('.');
  const formatted = parseInt(int || '0', 10).toLocaleString('en-MY');
  return dec !== undefined ? `${formatted}.${dec.slice(0, 2)}` : formatted;
}

function parseAmount(formatted: string): number {
  return parseFloat(formatted.replace(/,/g, '')) || 0;
}

export function QuickSendPanel() {
  const [rawAmount, setRawAmount] = useState('');
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  const numericAmount = parseAmount(rawAmount);

  useEffect(() => {
    if (numericAmount < 100) { setQuote(null); return; }
    const debounce = setTimeout(async () => {
      setFetchingQuote(true);
      try {
        const res = await api.get<FxQuote>(`/fx-quote?amount_myr=${numericAmount}`);
        setQuote(res.data);
      } catch {
        setQuote(null);
      } finally {
        setFetchingQuote(false);
      }
    }, 600);
    return () => clearTimeout(debounce);
  }, [numericAmount]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRawAmount(formatAmount(e.target.value));
  }, []);

  const ROUTE_STEPS = ['FPX', 'Hata', 'USDT', 'Sui', 'Coins.ph', 'PHP bank'];
  const activeSteps = numericAmount > 0 ? ['FPX', 'Hata', 'USDT'] : [];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: '14px',
      boxShadow: 'var(--shadow-panel)',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>New transfer</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--raised)', border: '0.5px solid var(--border)',
          borderRadius: '5px', padding: '4px 8px',
          fontSize: '10px', color: 'var(--text-tertiary)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--settled)', display: 'inline-block', animation: 'splashSpin 2s linear infinite' }} />
          via Hata + Sui
        </div>
      </div>

      {/* Amount input */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--raised)', border: '0.5px solid var(--border-strong)',
          borderRadius: '7px', padding: '10px 14px', marginBottom: '8px',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
        }}
        onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-focus)'; }}
        onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      >
        <span style={{
          background: 'var(--active)', border: '0.5px solid var(--border)',
          borderRadius: '5px', padding: '3px 8px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
          color: 'var(--myr)', fontWeight: 500, flexShrink: 0,
        }}>
          MYR
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={rawAmount}
          onChange={handleAmountChange}
          placeholder="0.00"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '26px',
            fontWeight: 500, color: 'var(--myr)',
            caretColor: 'var(--blue)',
          }}
        />
      </div>

      {/* FX conversion */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', marginBottom: '12px', height: '18px' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {fetchingQuote
            ? 'Fetching rate...'
            : quote
              ? `1 MYR = ${(1 / parseFloat(quote.rate)).toFixed(4)} USDT`
              : 'Enter amount for live rate'}
        </span>
        {quote && !fetchingQuote && (
          <span style={{ color: 'var(--usdt)', fontWeight: 500 }}>
            ≈ USDT {parseFloat(quote.usdtAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Route chain */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        background: 'var(--raised)', border: '0.5px solid var(--border)',
        borderRadius: '7px', padding: '8px 12px', marginBottom: '16px',
      }}>
        {ROUTE_STEPS.map((step, i) => (
          <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
            <span style={{ color: activeSteps.includes(step) ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
              {step}
            </span>
            {i < ROUTE_STEPS.length - 1 && (
              <span style={{ color: 'var(--text-disabled)' }}>→</span>
            )}
          </span>
        ))}
      </div>

      {/* Submit */}
      <Button
        variant="primary"
        size="full"
        disabled={numericAmount < 100}
        className="disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {numericAmount >= 100
          ? `Send RM ${numericAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
          : 'Enter amount to continue'}
      </Button>
    </div>
  );
}
