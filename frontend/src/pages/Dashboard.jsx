import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { TrendingUp, Users, Clock, DollarSign, ArrowRight, Upload, Lightbulb, ArrowUpRight } from "lucide-react";

const STATUS_STYLES = {
  completed: { bg: "rgba(0,210,160,0.12)", color: "#00B689", label: "Completed" },
  pending: { bg: "rgba(255,184,0,0.14)", color: "#B17800", label: "Pending" },
  failed: { bg: "rgba(229,62,62,0.10)", color: "#C53030", label: "Failed" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.completed;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }} data-testid={`status-${status}`}>
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, trend, color, idx }) {
  return (
    <div className="bg-white rounded-xl p-5 border animate-fade-up" style={{ borderColor: "var(--splash-border)", animationDelay: `${idx*60}ms` }} data-testid={`stat-card-${idx}`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--splash-green)" }}>
            <ArrowUpRight size={12} /> {trend}
          </span>
        )}
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider" style={{ color: "var(--splash-muted)" }}>{label}</div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums mt-1" style={{ color: "var(--splash-text)" }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([api.get("/transfers/stats"), api.get("/transfers", { params: { limit: 8 } })]);
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
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--splash-muted)" }}>Overview of your cross-border payouts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard idx={0} icon={TrendingUp} label="Total sent this month" value={stats ? formatMYR(stats.total_sent_myr_month) : "—"} trend="+12% vs last" color="#22A7F0" />
        <StatCard idx={1} icon={Users} label="Active recipients" value={stats?.active_recipients ?? "—"} color="#00D2A0" />
        <StatCard idx={2} icon={Clock} label="Pending transfers" value={stats?.pending_transfers ?? "—"} color="#FFB800" />
        <StatCard idx={3} icon={DollarSign} label="Avg. settlement time" value={stats ? fmtAvg(stats.avg_settlement_seconds) : "—"} color="#0A1E3F" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfers table */}
        <div className="lg:col-span-8 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--splash-border)" }} data-testid="recent-transfers">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--splash-border)" }}>
            <h2 className="font-semibold tracking-tight">Recent transfers</h2>
            <Link to="/transfers" className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all" style={{ color: "var(--splash-cyan)" }} data-testid="view-all-transfers">
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
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--splash-muted)" }}>No transfers yet</td></tr>
                )}
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-slate-50/60 transition" style={{ borderColor: "var(--splash-border)" }}>
                    <Td className="text-xs" style={{ color: "var(--splash-muted)" }}>{formatDateTime(t.created_at)}</Td>
                    <Td>
                      <div className="font-medium">{t.recipient_name}</div>
                      <div className="text-xs flex items-center gap-1" style={{ color: "var(--splash-muted)" }}>
                        <span>🇵🇭</span><span>{t.recipient_bank?.split(" (")[0]}</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums font-medium">{formatMYR(t.send_amount_myr)}</Td>
                    <Td className="text-right tabular-nums" style={{ color: "var(--splash-green)" }}>{formatPHP(t.receive_amount_php)}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td className="text-right">
                      <Link to="/transfers" className="text-xs font-medium" style={{ color: "var(--splash-cyan)" }}>View</Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: "var(--splash-border)" }}>
            <h3 className="font-semibold tracking-tight">Quick actions</h3>
            <p className="text-xs mt-1" style={{ color: "var(--splash-muted)" }}>Get money moving in seconds.</p>
            <div className="mt-4 space-y-2">
              <Link to="/send" data-testid="quick-send-payout" className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg font-medium text-white transition hover:opacity-95"
                style={{ backgroundColor: "var(--splash-green)" }}>
                <span className="flex items-center gap-2"><Send size={16} /> Send a payout</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/batch" data-testid="quick-batch-csv" className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg font-medium transition hover:bg-slate-50 border"
                style={{ borderColor: "var(--splash-border)", color: "var(--splash-text)" }}>
                <span className="flex items-center gap-2"><Upload size={16} /> Upload batch CSV</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="rounded-xl p-4 flex gap-3" style={{ backgroundColor: "#EBF5FB", border: "1px solid #BEE3F8" }}>
            <Lightbulb size={18} style={{ color: "#1F4E79" }} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed" style={{ color: "#1F4E79" }}>
              <span className="font-medium">Tip:</span> Batch payouts save 40% time for 10+ recipients.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) { return <th className={`px-5 py-3 text-xs font-medium uppercase tracking-wider ${className}`} style={{ color: "var(--splash-muted)" }}>{children}</th>; }
function Td({ children, className = "", style }) { return <td className={`px-5 py-3.5 ${className}`} style={style}>{children}</td>; }

function Send(props) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
}
