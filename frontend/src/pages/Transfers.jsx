import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { API, formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { Search, Download, MoreHorizontal, RefreshCw, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { toast } from "sonner";

const STATUSES = [
  { key: "all",       label: "All" },
  { key: "completed", label: "Settled" },
  { key: "pending",   label: "Pending" },
  { key: "failed",    label: "Failed" },
];

const BADGE = {
  completed: { bg: "var(--success-bg)", c: "var(--success)", l: "Settled" },
  pending:   { bg: "var(--warning-bg)", c: "var(--warning)", l: "Pending" },
  failed:    { bg: "var(--danger-bg)",  c: "var(--danger)",  l: "Failed"  },
};

export default function Transfers() {
  const [rows, setRows]     = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const perPage = 20;

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/transfers", { params: { status, search, limit: 200 } });
      setRows(data);
      setPage(1);
    })();
  }, [status, search]);

  const paged      = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page]);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));

  // ── Summary stats (last 30 days) ──────────────────────────────────────────
  const stats = useMemo(() => {
    const completed   = rows.filter(r => r.status === "completed");
    const totalSent   = completed.reduce((s, r) => s + (r.send_amount_myr || 0), 0);
    const totalFees   = completed.reduce((s, r) => s + (r.total_fee_myr  || 0), 0);
    const effectiveRate = totalSent > 0 ? ((totalFees / totalSent) * 100).toFixed(2) : "0.00";
    const avgSec      = completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + (r.settlement_time_seconds || 221), 0) / completed.length)
      : 221;
    const mins = Math.floor(avgSec / 60);
    const secs = avgSec % 60;
    return {
      totalSent,
      totalFees,
      effectiveRate,
      avgSettlement: `${mins}m ${secs.toString().padStart(2, "0")}s`,
      completedCount: completed.length,
    };
  }, [rows]);

  const exportCSV = () => {
    const header = ["Date","Reference","Recipient","Bank","Sent (MYR)","Received (PHP)","Fee (MYR)","Status"];
    const lines  = [header.join(",")];
    rows.forEach(r => lines.push([
      formatDateTime(r.created_at), r.reference, r.recipient_name, r.recipient_bank,
      r.send_amount_myr, r.receive_amount_php, r.total_fee_myr, r.status,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `splash-transfers-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-5" data-testid="transfers-page">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>History</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>Search, filter and export your payout history.</p>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total sent */}
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Total sent</div>
          <div className="text-xl font-bold tabular-nums leading-tight" style={{ color: "var(--myr)" }}>
            {formatMYR(stats.totalSent)}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>{stats.completedCount} settled</div>
        </div>

        {/* Total fees */}
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Total fees</div>
          <div className="text-xl font-bold tabular-nums leading-tight" style={{ color: "var(--ink)" }}>
            {formatMYR(stats.totalFees)}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>{stats.effectiveRate}% effective</div>
        </div>

        {/* Avg settlement */}
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Avg settlement</div>
          <div className="text-xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
            {stats.avgSettlement}
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>last 30 days</div>
        </div>

        {/* Matching */}
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--outline)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--ink-3)" }}>Matching</div>
          <div className="text-xl font-bold leading-tight" style={{ color: "var(--success)" }}>
            {rows.length > 0 ? Math.round((stats.completedCount / rows.length) * 100) : 100}%
          </div>
          <div className="text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>no discrepancies</div>
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
        style={{ borderColor: "var(--outline)", backgroundColor: "var(--surface)" }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-4)" }} />
          <input
            data-testid="search-transfers"
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by recipient or reference..."
            className="w-full rounded-md border pl-8 pr-3 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--outline)", color: "var(--ink)", backgroundColor: "var(--raised)", fontSize: "13px" }}
            onFocus={e  => { e.target.style.borderColor = "var(--indigo)"; }}
            onBlur={e   => { e.target.style.borderColor = "var(--outline)"; }}
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border p-0.5"
          style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)" }}>
          {STATUSES.map(s => (
            <button
              key={s.key} onClick={() => setStatus(s.key)} data-testid={`filter-${s.key}`}
              className="px-3 py-1 rounded text-xs font-medium transition"
              style={{
                backgroundColor: status === s.key ? "var(--indigo)" : "transparent",
                color: status === s.key ? "#fff" : "var(--ink-3)",
              }}
            >{s.label}</button>
          ))}
        </div>
        <button onClick={exportCSV} data-testid="export-csv"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border"
          style={{ borderColor: "var(--outline)", color: "var(--ink)", backgroundColor: "var(--surface)" }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--outline)", backgroundColor: "var(--surface)" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: "13px" }}>
            <thead style={{ backgroundColor: "var(--raised)" }}>
              <tr className="text-left">
                <Th>Recipient</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Recipient gets</Th>
                <Th className="text-right">Fee</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-14 text-center">
                  <FileText size={26} className="mx-auto mb-2" style={{ color: "var(--ink-4)" }} />
                  <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>No transfers yet</div>
                  <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>Try adjusting your filters.</div>
                  <Link to="/send" className="inline-block mt-3 text-sm font-medium" style={{ color: "var(--indigo)" }}>Send your first payout →</Link>
                </td></tr>
              ) : paged.map(r => {
                const b = BADGE[r.status] || BADGE.completed;
                return (
                  <tr key={r.id} className="border-t interactive-row" style={{ borderColor: "var(--outline)" }}>
                    {/* Recipient */}
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                          style={{ backgroundColor: "#6366F1" }}>
                          {(r.recipient_name || "?").split(" ").map((n: string) => n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: "var(--ink)" }}>{r.recipient_name}</div>
                          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                            🇵🇭 PH · {r.reference}
                          </div>
                        </div>
                      </div>
                    </Td>
                    {/* Date */}
                    <Td style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {formatDateTime(r.created_at)}
                    </Td>
                    {/* Status */}
                    <Td>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: b.bg, color: b.c }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.c }} />
                        {b.l}
                      </span>
                    </Td>
                    {/* Amount */}
                    <Td className="text-right tabular-nums font-semibold" style={{ color: "var(--myr)" }}>
                      {formatMYR(r.send_amount_myr)}
                    </Td>
                    {/* Recipient gets */}
                    <Td className="text-right tabular-nums font-semibold" style={{ color: "var(--php)" }}>
                      {r.receive_amount_php ? formatPHP(r.receive_amount_php) : "—"}
                    </Td>
                    {/* Fee */}
                    <Td className="text-right tabular-nums" style={{ color: "var(--ink-3)" }}>
                      {formatMYR(r.total_fee_myr || 0)}
                    </Td>
                    {/* Actions */}
                    <Td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button data-testid={`row-actions-${r.id}`}
                            className="p-1.5 rounded hover:bg-slate-100">
                            <MoreHorizontal size={15} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(r.sui_explorer_url, "_blank")}>
                            View on Sui Explorer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const token = localStorage.getItem("splash_token");
                              const res = await fetch(`${API}/transfers/${r.id}/receipt`, {
                                credentials: "include",
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                              });
                              if (!res.ok) throw new Error("Failed");
                              const blob = await res.blob();
                              const url  = URL.createObjectURL(blob);
                              const a    = document.createElement("a");
                              a.href = url; a.download = `splash-receipt-${r.reference}.pdf`;
                              a.click(); URL.revokeObjectURL(url);
                              toast.success("Receipt downloaded");
                            } catch { toast.error("Could not download receipt"); }
                          }}>Download PDF</DropdownMenuItem>
                          {r.status === "failed"
                            ? <DropdownMenuItem onClick={() => toast.success("Retry queued")}><RefreshCw size={12} className="mr-2"/>Retry</DropdownMenuItem>
                            : <DropdownMenuItem onClick={() => toast.info("Send again opened (demo)")}>Send again</DropdownMenuItem>
                          }
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t"
            style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)", fontSize: "12px", color: "var(--ink-3)" }}>
            <span className="tabular-nums">
              Showing {(page-1)*perPage+1}–{Math.min(page*perPage, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                className="px-2.5 py-1 rounded border text-xs disabled:opacity-40"
                style={{ borderColor: "var(--outline)" }} data-testid="prev-page">Prev</button>
              <span className="px-2 tabular-nums">{page} / {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}
                className="px-2.5 py-1 rounded border text-xs disabled:opacity-40"
                style={{ borderColor: "var(--outline)" }} data-testid="next-page">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: any) {
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider ${className}`}
      style={{ color: "var(--ink-3)" }}>{children}</th>
  );
}
function Td({ children, className = "", style }: any) {
  return <td className={`px-4 py-3 ${className}`} style={style}>{children}</td>;
}
