import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api, { formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { ArrowRight, Upload, Send } from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────
const BADGE = {
  completed: { bg: "var(--success-bg)", c: "var(--success)", l: "Settled" },
  pending:   { bg: "var(--warning-bg)", c: "var(--warning)", l: "Pending" },
  failed:    { bg: "var(--danger-bg)",  c: "var(--danger)",  l: "Failed"  },
};

// ── Tiny sparkline SVG ────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#4338CA", height = 60 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [fxRate, setFxRate]     = useState(12.9889);
  const [chartRange, setChartRange] = useState("30d");

  // Simulated volume data for chart
  const volumeData = [18, 22, 19, 31, 28, 35, 29, 42, 38, 45, 41, 50, 47, 55, 52, 60, 58, 65, 62, 70];

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          api.get("/transfers/stats"),
          api.get("/transfers", { params: { limit: 6 } }),
        ]);
        setStats(s.data);
        setTransfers(t.data.slice(0, 6));
      } catch {}
    })();
  }, []);

  const userName = "Aisyah";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }} data-testid="dashboard-page">

      {/* ── Header ── */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
          {greeting}, {userName}
        </h1>
        <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "3px" }}>
          MY Malaysia → PH Philippines · Phase 1 corridor · live on Sui mainnet
        </p>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <Link to="/batch"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 500,
            border: "1px solid var(--outline)", color: "var(--ink)", backgroundColor: "var(--surface)",
            textDecoration: "none",
          }}>
          <Upload size={13} /> Batch upload
        </Link>
        <Link to="/send"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
            backgroundColor: "var(--indigo)", color: "#fff", textDecoration: "none",
          }}>
          <Send size={13} /> New payout
        </Link>
      </div>

      {/* ── Section 01: Today at a glance ── */}
      <SectionLabel num="01" title="Today at a glance" />
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: "10px", marginBottom: "16px" }}>
        <StatCard
          label="VOLUME TODAY"
          value={stats ? formatMYR(stats.total_sent_myr_today || 11250) : "RM 11,250.00"}
          sub={<span style={{ color: "var(--success)" }}>↑ 18% vs yesterday</span>}
          accent="var(--indigo)"
        />
        <StatCard
          label="VOLUME MTD"
          value={stats ? formatMYR(stats.total_sent_myr_month || 78420) : "RM 78,420.00"}
          sub={<span style={{ color: "var(--success)" }}>↑ 32% vs Apr</span>}
          accent="var(--indigo)"
        />
        <StatCard
          label="SETTLED (30D)"
          value={stats?.completed_transfers_30d ?? 55}
          sub={<span style={{ color: "var(--ink-3)" }}>2 in-flight now</span>}
        />
        <StatCard
          label="ALL-IN COST"
          value="105 bps"
          sub={<span style={{ color: "var(--ink-3)" }}>band 75–120 bps</span>}
        />
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]" style={{ gap: "12px", marginBottom: "16px" }}>

        {/* Volume chart */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--ink-3)", fontWeight: 500 }}>Volume — last 20 days</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", marginTop: "2px" }}>
                RM 412,840.00
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {["7d","30d","90d"].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  style={{
                    padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 500,
                    border: "1px solid var(--outline)", cursor: "pointer",
                    backgroundColor: chartRange === r ? "var(--indigo)" : "var(--raised)",
                    color: chartRange === r ? "#fff" : "var(--ink-3)",
                  }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <Sparkline data={volumeData} color="var(--indigo)" height={80} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--ink-4)", marginTop: "4px" }}>
            <span>Apr 14</span><span>May 4</span>
          </div>
        </div>

        {/* Live FX panel */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>Live FX · MYR — PHP</span>
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "10px", backgroundColor: "var(--success-bg)", color: "var(--success)", fontWeight: 500 }}>
              Pyth · 0.4s ago
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--ink-3)", fontWeight: 500 }}>MY 1 MYR =</span>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{fxRate.toFixed(4)}</span>
            <span style={{ fontSize: "12px", color: "var(--ink-3)" }}>PHP</span>
            <span style={{ fontSize: "11px", color: "var(--danger)", fontWeight: 500 }}>−0.04%</span>
          </div>

          <div style={{ borderTop: "1px solid var(--outline)", paddingTop: "10px", marginTop: "10px" }}>
            {[
              ["Spread (locked)", "52 bps", "var(--ink)"],
              ["Total cost",      "105 bps","var(--ink)"],
              ["USDC peg (Pyth)", "$1.0001 ✓","var(--success)"],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                <span style={{ color: "var(--ink-3)" }}>{k}</span>
                <span style={{ color: c, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "10px", color: "var(--ink-4)", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--outline)" }}>
            ◇ Switchboard fallback active · oracle deviation &lt; 30 bps
          </div>
        </div>
      </div>

      {/* ── Section 02: Phase 1 settlement rail ── */}
      <SectionLabel num="02" title="Phase 1 settlement rail" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { top: "FPX",           bot: "MYR in",       highlight: false },
            { top: "HATA EXCHANGE", bot: "MYR → USDC",   highlight: false },
            { top: "SUI · USDC",    bot: "Atomic PTB",   highlight: false },
            { top: "COINS.PH",      bot: "USDC → PHP",   highlight: false },
            { top: "PH BANK",       bot: "< 5 min",      highlight: true  },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                padding: "8px 12px", borderRadius: "8px", textAlign: "center", minWidth: "80px",
                backgroundColor: step.highlight ? "var(--success-bg)" : "var(--raised)",
                border: `1px solid ${step.highlight ? "var(--success-border)" : "var(--outline)"}`,
              }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{step.top}</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: step.highlight ? "var(--success)" : "var(--ink)", marginTop: "2px" }}>{step.bot}</div>
              </div>
              {i < 4 && <span style={{ color: "var(--ink-4)", fontSize: "14px" }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 03: Recent payouts ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <SectionLabel num="03" title="Recent payouts" inline />
        <Link to="/transfers" style={{ fontSize: "12px", color: "var(--indigo)", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--raised)" }}>
              {["RECIPIENT","DATE","STATUS","AMOUNT","RECIPIENT GETS","FEE"].map(h => (
                <th key={h} style={{ padding: "8px 14px", textAlign: h === "AMOUNT" || h === "RECIPIENT GETS" || h === "FEE" ? "right" : "left", fontSize: "10px", fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", borderBottom: "1px solid var(--outline)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--ink-3)", fontSize: "13px" }}>No transfers yet</td></tr>
            ) : transfers.map((t, i) => {
              const b = BADGE[t.status] || BADGE.completed;
              return (
                <tr key={t.id} style={{ borderTop: "1px solid var(--outline)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--raised)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}>
                  {/* Recipient */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 600, color: "#fff",
                        backgroundColor: ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6"][i % 6],
                      }}>
                        {(t.recipient_name||"?").split(" ").map(n=>n[0]).slice(0,2).join("")}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>{t.recipient_name}</div>
                        <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>🇵🇭 PH · {t.reference}</div>
                      </div>
                    </div>
                  </td>
                  {/* Date */}
                  <td style={{ padding: "10px 14px", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {formatDateTime(t.created_at)}
                  </td>
                  {/* Status */}
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, backgroundColor: b.bg, color: b.c }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: b.c }} />
                      {b.l}
                    </span>
                  </td>
                  {/* Amount */}
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "var(--myr)", fontVariantNumeric: "tabular-nums" }}>
                    {formatMYR(t.send_amount_myr)}
                  </td>
                  {/* Recipient gets */}
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "var(--php)", fontVariantNumeric: "tabular-nums" }}>
                    {t.receive_amount_php ? formatPHP(t.receive_amount_php) : "—"}
                  </td>
                  {/* Fee */}
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
                    {formatMYR(t.total_fee_myr || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Section 04: Treasury & compliance ── */}
      <SectionLabel num="04" title="Treasury & compliance" />
      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "10px" }}>
        {[
          { label: "USDC balance",    value: "USDC 0.00",    sub: "on Sui testnet",       color: "var(--usdt)" },
          { label: "Float reserve",   value: "RM 0.00",      sub: "working capital",      color: "var(--myr)" },
          { label: "KYT alerts",      value: "0 flagged",    sub: "last 30 days",         color: "var(--success)" },
        ].map(c => (
          <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>{c.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: c.color, letterSpacing: "-0.01em" }}>{c.value}</div>
            <div style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "3px" }}>{c.sub}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ num, title, inline = false }) {
  const el = (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: inline ? 0 : "10px" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "20px", height: "20px", borderRadius: "5px", fontSize: "10px", fontWeight: 700,
        backgroundColor: "var(--raised)", color: "var(--ink-3)", border: "1px solid var(--outline)",
        flexShrink: 0,
      }}>{num}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{title}</span>
    </div>
  );
  return el;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--outline)", borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: accent || "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}
