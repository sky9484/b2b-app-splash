import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { API, formatMYR, formatPHP, formatDateTime } from "../lib/api";
import { Search, Download, MoreHorizontal, RefreshCw, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { toast } from "sonner";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
];

const BADGE = {
  completed: { bg: "rgba(0,210,160,0.12)", c: "#00B689", l: "Completed" },
  pending: { bg: "rgba(255,184,0,0.14)", c: "#B17800", l: "Pending" },
  failed: { bg: "rgba(229,62,62,0.10)", c: "#C53030", l: "Failed" },
};

export default function Transfers() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/transfers", { params: { status, search, limit: 200 } });
      setRows(data);
      setPage(1);
    })();
  }, [status, search]);

  const paged = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page]);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));

  const exportCSV = () => {
    const header = ["Date", "Reference", "Recipient", "Bank", "Sent (MYR)", "Received (PHP)", "Fee (MYR)", "Status"];
    const lines = [header.join(",")];
    rows.forEach((r) => lines.push([
      formatDateTime(r.created_at), r.reference, r.recipient_name, r.recipient_bank,
      r.send_amount_myr, r.receive_amount_php, r.total_fee_myr, r.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `splash-transfers-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6" data-testid="transfers-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transfers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--splash-muted)" }}>Search, filter and export your payout history.</p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border p-4" style={{ borderColor: "var(--splash-border)" }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="search-transfers"
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient or reference..."
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#22A7F0]/30"
            style={{ borderColor: "var(--splash-border)" }}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--splash-border)" }}>
          {STATUSES.map((s) => (
            <button
              key={s.key} onClick={() => setStatus(s.key)} data-testid={`filter-${s.key}`}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition"
              style={{
                backgroundColor: status === s.key ? "var(--splash-navy)" : "transparent",
                color: status === s.key ? "#fff" : "var(--splash-muted)",
              }}
            >{s.label}</button>
          ))}
        </div>
        <button onClick={exportCSV} data-testid="export-csv" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border bg-white hover:bg-slate-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "var(--splash-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--splash-bg)" }}>
              <tr className="text-left">
                <Th>Date</Th><Th>Reference</Th><Th>Recipient</Th><Th>Bank</Th>
                <Th className="text-right">Sent</Th><Th className="text-right">Received</Th>
                <Th className="text-right">Fee</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-medium">No transfers yet</div>
                  <div className="text-xs mt-1" style={{ color: "var(--splash-muted)" }}>Try adjusting your filters.</div>
                  <Link to="/send" className="inline-block mt-3 text-sm font-medium" style={{ color: "var(--splash-cyan)" }}>Send your first payout →</Link>
                </td></tr>
              ) : paged.map((r) => {
                const b = BADGE[r.status];
                return (
                  <tr key={r.id} className="border-t hover:bg-slate-50/60" style={{ borderColor: "var(--splash-border)" }}>
                    <Td className="text-xs whitespace-nowrap" style={{ color: "var(--splash-muted)" }}>{formatDateTime(r.created_at)}</Td>
                    <Td><span className="mono text-xs">{r.reference}</span></Td>
                    <Td><span className="font-medium">{r.recipient_name}</span> <span className="ml-1">🇵🇭</span></Td>
                    <Td className="text-xs" style={{ color: "var(--splash-muted)" }}>{r.recipient_bank?.split(" (")[0]}</Td>
                    <Td className="text-right tabular-nums">{formatMYR(r.send_amount_myr)}</Td>
                    <Td className="text-right tabular-nums" style={{ color: "var(--splash-green)" }}>{formatPHP(r.receive_amount_php)}</Td>
                    <Td className="text-right tabular-nums text-xs" style={{ color: "var(--splash-muted)" }}>{formatMYR(r.total_fee_myr)}</Td>
                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: b.bg, color: b.c }}>{b.l}</span>
                    </Td>
                    <Td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button data-testid={`row-actions-${r.id}`} className="p-1.5 rounded hover:bg-slate-100"><MoreHorizontal size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(r.sui_explorer_url, "_blank")}>View on Sui Explorer</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const token = localStorage.getItem("splash_token");
                              const res = await fetch(`${API}/transfers/${r.id}/receipt`, {
                                credentials: "include",
                                headers: token ? { Authorization: `Bearer ${token}` } : {},
                              });
                              if (!res.ok) throw new Error("Failed");
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = `splash-receipt-${r.reference}.pdf`;
                              a.click(); URL.revokeObjectURL(url);
                              toast.success("Receipt downloaded");
                            } catch {
                              toast.error("Could not download receipt");
                            }
                          }}>Download PDF</DropdownMenuItem>
                          {r.status === "failed" ? (
                            <DropdownMenuItem onClick={() => toast.success("Retry queued")}><RefreshCw size={12} className="mr-2"/>Retry</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => toast.info("Send again opened (demo)")}>Send again</DropdownMenuItem>
                          )}
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
          <div className="flex items-center justify-between px-5 py-3 border-t text-sm" style={{ borderColor: "var(--splash-border)", color: "var(--splash-muted)" }}>
            <span className="tabular-nums">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, rows.length)} of {rows.length}</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded-md border text-xs disabled:opacity-40 hover:bg-slate-50" data-testid="prev-page">Prev</button>
              <span className="px-2 tabular-nums">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded-md border text-xs disabled:opacity-40 hover:bg-slate-50" data-testid="next-page">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }) { return <th className={`px-5 py-3 text-xs font-medium uppercase tracking-wider ${className}`} style={{ color: "var(--splash-muted)" }}>{children}</th>; }
function Td({ children, className = "", style }) { return <td className={`px-5 py-3.5 ${className}`} style={style}>{children}</td>; }
