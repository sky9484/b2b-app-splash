import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api, { formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { TrendingUp, Users, Clock, DollarSign, ArrowRight, Upload, Zap, ArrowUpRight } from "lucide-react";

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
  completed: { bg: "var(--success-bg)", color: "var(--success)", dot: "var(--success)", label: "Completed" },
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
function StatCard({ icon: Icon, label, value, trend, color, idx }) {
  return (
    <motion.div
      variants={fadeUp} custom={idx} initial="hidden" animate="show"
      whileHover={{ y: -4, boxShadow: "var(--shadow-row)" }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="rounded-2xl p-6 cursor-default"
      style={{ backgroundColor: "var(--surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--outline)" }}
      data-testid={`stat-card-${idx}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + "18", color }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}>
            <ArrowUpRight size={11} /> {trend}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight tabular-nums"
        style={{ color: "var(--ink)" }}>{value}</div>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          api.get("/transfers/stats"),
          api.get("/transfers", { params: { limit: 8 } }),
        ]);
        setStats(s.data);
        setTransfers(t.data.slice(0, 8));
      } catch {}
    })();
  }, []);

  const fmtAvg = (sec) => {
    const m = Math.floor((sec || 0) / 60);
    const s = (sec || 0) % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="show">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--ink-3)" }}>
          Overview of your cross-border payouts.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard idx={0} icon={TrendingUp} label="Total sent this month"
          value={stats ? formatMYR(stats.total_sent_myr_month) : "—"}
          trend="+12% vs last" color="var(--indigo)" />
        <StatCard idx={1} icon={Users} label="Active recipients"
          value={stats?.active_recipients ?? "—"} color="var(--success)" />
        <StatCard idx={2} icon={Clock} label="Pending transfers"
          value={stats?.pending_transfers ?? "—"} color="var(--warning)" />
        <StatCard idx={3} icon={DollarSign} label="Avg. settlement time"
          value={stats ? fmtAvg(stats.avg_settlement_seconds) : "—"} color="var(--ink)" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfers table */}
        <motion.div
          variants={fadeUp} custom={4} initial="hidden" animate="show"
          className="lg:col-span-8 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--outline)" }}
          data-testid="recent-transfers"
        >
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--outline)" }}>
            <h2 className="font-bold text-base tracking-tight" style={{ color: "var(--ink)" }}>
              Recent transfers
            </h2>
            <Link to="/transfers"
              className="text-sm font-semibold flex items-center gap-1.5 transition-all hover:gap-2.5"
              style={{ color: "var(--indigo)" }}
              data-testid="view-all-transfers">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--raised)" }}>
                <tr className="text-left">
                  <Th>Date</Th>
                  <Th>Recipient</Th>
                  <Th className="text-right">You sent</Th>
                  <Th className="text-right">They received</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm font-medium"
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
                      className="border-t interactive-row"
                      style={{ borderColor: "var(--outline)" }}
                    >
                      <Td className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>
                        {formatDateTime(t.created_at)}
                      </Td>
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
                      <Td className="text-right tabular-nums font-semibold"
                        style={{ color: "var(--myr)" }}>
                        {formatMYR(t.send_amount_myr)}
                      </Td>
                      <Td className="text-right tabular-nums font-semibold"
                        style={{ color: "var(--php)" }}>
                        {formatPHP(t.receive_amount_php)}
                      </Td>
                      <Td><StatusBadge status={t.status} /></Td>
                      <Td className="text-right">
                        <Link to="/transfers"
                          className="text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ color: "var(--indigo)" }}>
                          View
                        </Link>
                      </Td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick actions */}
          <motion.div
            variants={fadeUp} custom={5} initial="hidden" animate="show"
            className="rounded-2xl p-6"
            style={{ backgroundColor: "var(--surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--outline)" }}
          >
            <h3 className="font-bold text-base tracking-tight mb-1"
              style={{ color: "var(--ink)" }}>Quick actions</h3>
            <p className="text-xs font-medium mb-5" style={{ color: "var(--ink-3)" }}>
              Get money moving in seconds.
            </p>
            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link to="/send" data-testid="quick-send-payout"
                  className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-sm font-semibold text-white rounded-xl transition-all"
                  style={{ backgroundColor: "var(--indigo)", color: "white" }}>
                  <span className="flex items-center gap-2.5">
                    <Zap size={16} strokeWidth={2.5} /> Send a payout
                  </span>
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link to="/batch" data-testid="quick-batch-csv"
                  className="w-full flex items-center justify-between gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ border: "2px solid var(--outline)", color: "var(--ink)", backgroundColor: "transparent" }}>
                  <span className="flex items-center gap-2.5">
                    <Upload size={16} strokeWidth={2} /> Upload batch CSV
                  </span>
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Tip card */}
          <motion.div
            variants={fadeUp} custom={6} initial="hidden" animate="show"
            className="rounded-2xl p-5 flex gap-3"
            style={{
              background: "var(--indigo-light)",
              border: "1px solid var(--indigo-border)",
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "var(--indigo-subtle)" }}>
              <Zap size={16} style={{ color: "var(--indigo)" }} />
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              <span className="font-bold">Pro tip:</span> Batch payouts save 40% time for 10+ recipients.{" "}
              <Link to="/batch" className="font-semibold underline underline-offset-2"
                style={{ color: "var(--indigo)" }}>Try it →</Link>
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
