import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api, { formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { TrendingUp, Users, Clock, DollarSign, ArrowRight, Upload, Zap, ArrowUpRight, ChevronDown } from "lucide-react";

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, type: "spring", stiffness: 380, damping: 28 },
  }),
};

const tableRow = {
  hidden: { opacity: 0, x: -8 },
  show: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, type: "spring", stiffness: 400, damping: 30 },
  }),
};

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS = {
  completed: { bg: "var(--success-bg)", color: "var(--success)", dot: "var(--success)", label: "Settled" },
  pending:   { bg: "var(--warning-bg)", color: "var(--warning)", dot: "var(--warning)", label: "Pending" },
  failed:    { bg: "var(--danger-bg)", color: "var(--danger)", dot: "var(--danger)", label: "Failed" },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.completed;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendLabel, idx }) {
  return (
    <motion.div
      variants={fadeUp} custom={idx} initial="hidden" animate="show"
      className="rounded-lg p-4 cursor-default"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
      data-testid={`stat-card-${idx}`}
    >
      <div className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight tabular-nums mb-1"
        style={{ color: "var(--ink)" }}>{value}</div>
      {trend && (
        <span className="text-xs font-medium flex items-center gap-1"
          style={{ color: trend > 0 ? "var(--success)" : "var(--ink-3)" }}>
          {trend > 0 ? "↑" : "↓"} {trendLabel}
        </span>
      )}
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [fxRate, setFxRate] = useState(12.9822);

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

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header with greeting */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Good afternoon, Aisyah
        </h1>
        <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--ink-3)" }}>
          MY Malaysia → PH Philippines · Phase 1 corridor · live on Sui mainnet
        </p>
      </motion.div>

      {/* Today at a glance - 4 stat cards */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="show">
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-3)" }}>
          Today at a glance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard idx={0} label="Volume today" value={stats ? formatMYR(stats.total_sent_myr_today || 0) : "—"} trend={1} trendLabel="9.8% vs yesterday" />
          <StatCard idx={1} label="Volume MTD" value={stats ? formatMYR(stats.total_sent_myr_month || 0) : "—"} trend={1} trendLabel="32% vs last month" />
          <StatCard idx={2} label="Settled (30d)" value={stats?.completed_transfers_30d ?? "—"} />
          <StatCard idx={3} label="All-in cost" value="105 bps" trendLabel="best 70-100 bps" />
        </div>
      </motion.div>

      {/* Main grid: Chart + Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chart + Settlement rail + Recent payouts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Volume chart */}
          <motion.div
            variants={fadeUp} custom={2} initial="hidden" animate="show"
            className="rounded-lg p-6"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--ink)" }}>
              Volume — last 20 days
            </h3>
            <div className="h-48 flex items-end justify-between gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    backgroundColor: "var(--indigo)",
                    opacity: 0.6 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs mt-3" style={{ color: "var(--ink-3)" }}>
              <span>APR 14</span>
              <span>May 4</span>
            </div>
          </motion.div>

          {/* Settlement rail */}
          <motion.div
            variants={fadeUp} custom={3} initial="hidden" animate="show"
            className="rounded-lg p-6"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--ink)" }}>
              Phase 1 settlement rail
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "FPX", value: "MYR in" },
                { label: "DATA EXCHANGE", value: "MYR → USDC" },
                { label: "SUI - USDC", value: "Atomic PTB" },
                { label: "COINS.PH", value: "USDC → PHP" },
                { label: "PH BANK", value: "< 5 min", highlight: true },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-center"
                    style={{
                      backgroundColor: step.highlight ? "var(--success-bg)" : "var(--raised)",
                      color: step.highlight ? "var(--success)" : "var(--ink)",
                      border: `1px solid ${step.highlight ? "var(--success)" : "var(--outline)"}`,
                    }}
                  >
                    <div className="font-bold">{step.label}</div>
                    <div className="text-xs opacity-80">{step.value}</div>
                  </div>
                  {i < 4 && <ArrowRight size={16} style={{ color: "var(--ink-3)" }} />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent payouts table */}
          <motion.div
            variants={fadeUp} custom={4} initial="hidden" animate="show"
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
            data-testid="recent-transfers"
          >
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--outline)" }}>
              <h2 className="font-bold text-sm tracking-tight" style={{ color: "var(--ink)" }}>
                Recent payouts
              </h2>
              <Link to="/transfers"
                className="text-xs font-semibold flex items-center gap-1 transition-all hover:gap-2"
                style={{ color: "var(--indigo)" }}
                data-testid="view-all-transfers">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: "var(--raised)" }}>
                  <tr className="text-left">
                    <Th>Recipient</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">Recipient gets</Th>
                    <Th className="text-right">Fee</Th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-xs font-medium"
                        style={{ color: "var(--ink-3)" }}>
                        No transfers yet
                      </td>
                    </tr>
                  )}
                  <AnimatePresence>
                    {transfers.map((t, i) => (
                      <motion.tr
                        key={t.id}
                        variants={tableRow} custom={i} initial="hidden" animate="show"
                        className="border-t"
                        style={{ borderColor: "var(--outline)" }}
                      >
                        <Td>
                          <div className="font-semibold" style={{ color: "var(--ink)" }}>
                            {t.recipient_name}
                          </div>
                          <div className="text-xs flex items-center gap-1 mt-0.5"
                            style={{ color: "var(--ink-3)" }}>
                            <span>🇵🇭</span>
                            <span>{t.recipient_bank?.split(" (")[0]}</span>
                          </div>
                        </Td>
                        <Td style={{ color: "var(--ink-3)" }}>
                          {formatDateTime(t.created_at).split(" ")[0]}
                        </Td>
                        <Td><StatusBadge status={t.status} /></Td>
                        <Td className="text-right tabular-nums font-semibold"
                          style={{ color: "var(--myr)" }}>
                          {formatMYR(t.send_amount_myr)}
                        </Td>
                        <Td className="text-right tabular-nums font-semibold"
                          style={{ color: "var(--php)" }}>
                          {formatPHP(t.receive_amount_php)}
                        </Td>
                        <Td className="text-right tabular-nums font-semibold"
                          style={{ color: "var(--ink-3)" }}>
                          {formatMYR(t.total_fee || 0)}
                        </Td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Right sidebar: FX rate + Quick actions */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live FX rate */}
          <motion.div
            variants={fadeUp} custom={5} initial="hidden" animate="show"
            className="rounded-lg p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: "var(--ink)" }}>
                Live FX: MYR → PHP
              </h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}>
                Pyth: 0.6s ago
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                  {fxRate.toFixed(4)} PHP
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: "var(--success)" }}>
                  ↓ 0.4% vs 1h
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between" style={{ color: "var(--ink-3)" }}>
                  <span>Spread (locked)</span>
                  <span style={{ color: "var(--ink)" }}>52 bps</span>
                </div>
                <div className="flex justify-between" style={{ color: "var(--ink-3)" }}>
                  <span>Total cost</span>
                  <span style={{ color: "var(--ink)" }}>185 bps</span>
                </div>
                <div className="flex justify-between" style={{ color: "var(--ink-3)" }}>
                  <span>USDC peg (Pyth)</span>
                  <span style={{ color: "var(--success)" }}>$1.0001 ✓</span>
                </div>
              </div>
              <div className="text-xs pt-2" style={{ color: "var(--ink-3)", borderTop: "1px solid var(--outline)" }}>
                ◇ Switchboard fallback active · oracle deviation &lt; 30 bps
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            variants={fadeUp} custom={6} initial="hidden" animate="show"
            className="rounded-lg p-5"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--outline)" }}
          >
            <h3 className="font-bold text-sm tracking-tight mb-1"
              style={{ color: "var(--ink)" }}>Quick actions</h3>
            <p className="text-xs font-medium mb-4" style={{ color: "var(--ink-3)" }}>
              Get money moving in seconds.
            </p>
            <div className="space-y-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link to="/send" data-testid="quick-send-payout"
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-all"
                  style={{ backgroundColor: "var(--indigo)" }}>
                  <span className="flex items-center gap-2">
                    <Zap size={14} /> Send payout
                  </span>
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link to="/batch" data-testid="quick-batch-csv"
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ border: "1px solid var(--outline)", color: "var(--ink)", backgroundColor: "transparent" }}>
                  <span className="flex items-center gap-2">
                    <Upload size={14} /> Batch upload
                  </span>
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-6 py-3.5 text-xs font-bold uppercase tracking-widest ${className}`}
      style={{ color: "var(--ink-3)" }}>
      {children}
    </th>
  );
}
function Td({ children, className = "", style }) {
  return <td className={`px-6 py-4 ${className}`} style={{ ...style, color: style?.color || "var(--ink)" }}>{children}</td>;
}
