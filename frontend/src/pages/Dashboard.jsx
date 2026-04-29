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
  completed: { bg: "rgba(0,210,160,0.12)", color: "#00A07A", dot: "#00D2A0", label: "Completed" },
  pending:   { bg: "rgba(255,184,0,0.14)", color: "#A07000", dot: "#FFB800", label: "Pending" },
  failed:    { bg: "rgba(229,62,62,0.10)", color: "#C53030", dot: "#E53E3E", label: "Failed" },
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
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(15,44,89,0.12)" }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="bg-white rounded-2xl p-6 cursor-default"
      style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--splash-border)" }}
      data-testid={`stat-card-${idx}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + "18", color }}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: "rgba(0,210,160,0.1)", color: "#00A07A" }}>
            <ArrowUpRight size={11} /> {trend}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: "var(--splash-muted)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight tabular-nums"
        style={{ color: "var(--splash-text)" }}>{value}</div>
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
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--splash-text)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1.5 font-medium" style={{ color: "var(--splash-muted)" }}>
          Overview of your cross-border payouts.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard idx={0} icon={TrendingUp} label="Total sent this month"
          value={stats ? formatMYR(stats.total_sent_myr_month) : "—"}
          trend="+12% vs last" color="#00D2FF" />
        <StatCard idx={1} icon={Users} label="Active recipients"
          value={stats?.active_recipients ?? "—"} color="#00D2A0" />
        <StatCard idx={2} icon={Clock} label="Pending transfers"
          value={stats?.pending_transfers ?? "—"} color="#FFB800" />
        <StatCard idx={3} icon={DollarSign} label="Avg. settlement time"
          value={stats ? fmtAvg(stats.avg_settlement_seconds) : "—"} color="#0F2C59" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfers table */}
        <motion.div
          variants={fadeUp} custom={4} initial="hidden" animate="show"
          className="lg:col-span-8 bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--splash-border)" }}
          data-testid="recent-transfers"
        >
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--splash-border)" }}>
            <h2 className="font-bold text-base tracking-tight" style={{ color: "var(--splash-text)" }}>
              Recent transfers
            </h2>
            <Link to="/transfers"
              className="text-sm font-semibold flex items-center gap-1.5 transition-all hover:gap-2.5"
              style={{ color: "var(--splash-cyan)" }}
              data-testid="view-all-transfers">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--splash-bg)" }}>
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
                      style={{ color: "var(--splash-muted)" }}>
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
                      style={{ borderColor: "var(--splash-border)" }}
                      whileHover={{ backgroundColor: "rgba(15,44,89,0.025)" }}
                    >
                      <Td className="text-xs font-medium" style={{ color: "var(--splash-muted)" }}>
                        {formatDateTime(t.created_at)}
                      </Td>
                      <Td>
                        <div className="font-semibold" style={{ color: "var(--splash-text)" }}>
                          {t.recipient_name}
                        </div>
                        <div className="text-xs flex items-center gap-1 mt-0.5"
                          style={{ color: "var(--splash-muted)" }}>
                          <span>🇵🇭</span>
                          <span>{t.recipient_bank?.split(" (")[0]}</span>
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums font-semibold"
                        style={{ color: "var(--splash-text)" }}>
                        {formatMYR(t.send_amount_myr)}
                      </Td>
                      <Td className="text-right tabular-nums font-semibold"
                        style={{ color: "var(--splash-green)" }}>
                        {formatPHP(t.receive_amount_php)}
                      </Td>
                      <Td><StatusBadge status={t.status} /></Td>
                      <Td className="text-right">
                        <Link to="/transfers"
                          className="text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ color: "var(--splash-cyan)" }}>
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
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: "var(--shadow-card)", border: "1px solid var(--splash-border)" }}
          >
            <h3 className="font-bold text-base tracking-tight mb-1"
              style={{ color: "var(--splash-text)" }}>Quick actions</h3>
            <p className="text-xs font-medium mb-5" style={{ color: "var(--splash-muted)" }}>
              Get money moving in seconds.
            </p>
            <div className="space-y-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link to="/send" data-testid="quick-send-payout"
                  className="neptune-btn w-full flex items-center justify-between gap-2 px-5 py-3.5 text-sm">
                  <span className="flex items-center gap-2.5">
                    <Zap size={16} strokeWidth={2.5} /> Send a payout
                  </span>
                  <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link to="/batch" data-testid="quick-batch-csv"
                  className="w-full flex items-center justify-between gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-50"
                  style={{ border: "2px solid var(--splash-border)", color: "var(--splash-text)" }}>
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
              background: "linear-gradient(135deg, #EBF5FB 0%, #E8F4FF 100%)",
              border: "1px solid #BEE3F8",
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(0,210,255,0.15)" }}>
              <Zap size={16} style={{ color: "var(--splash-cyan)" }} />
            </div>
            <div className="text-sm leading-relaxed" style={{ color: "#1F4E79" }}>
              <span className="font-bold">Pro tip:</span> Batch payouts save 40% time for 10+ recipients.{" "}
              <Link to="/batch" className="font-semibold underline underline-offset-2"
                style={{ color: "var(--splash-cyan)" }}>Try it →</Link>
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
      style={{ color: "var(--splash-muted)" }}>
      {children}
    </th>
  );
}
function Td({ children, className = "", style }) {
  return <td className={`px-6 py-4 ${className}`} style={style}>{children}</td>;
}
