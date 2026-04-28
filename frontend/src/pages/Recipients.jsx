import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatMYR, formatDate, initials, avatarColor } from "../lib/api";
import { Plus, Search, MoreHorizontal, Send, Trash2, Edit3 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

export default function Recipients() {
  const [recipients, setRecipients] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");

  const load = async () => {
    const { data } = await api.get("/recipients");
    setRecipients(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = recipients.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "most") arr = [...arr].sort((a, b) => (b.total_sent_myr || 0) - (a.total_sent_myr || 0));
    else arr = [...arr].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return arr;
  }, [recipients, search, sort]);

  const remove = async (id) => {
    if (!window.confirm("Remove this recipient?")) return;
    await api.delete(`/recipients/${id}`);
    setRecipients((r) => r.filter((x) => x.id !== id));
    toast.success("Recipient removed");
  };

  return (
    <div className="space-y-6" data-testid="recipients-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Recipients</h1>
          <p className="text-sm mt-1" style={{ color: "var(--splash-muted)" }}>{recipients.length} saved recipients across the Philippines.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="search-recipients" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipients..."
              className="w-56 rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#22A7F0]/30"
              style={{ borderColor: "var(--splash-border)" }}
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40 rounded-lg" data-testid="sort-recipients"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="most">Most sent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Add new card */}
        <Link to="/send" data-testid="add-new-recipient"
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-10 transition hover:bg-white hover:-translate-y-0.5"
          style={{ borderColor: "#CBD5E0", color: "var(--splash-muted)", minHeight: 180 }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,167,240,0.12)" }}>
            <Plus size={20} style={{ color: "var(--splash-cyan)" }} />
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--splash-text)" }}>Add new recipient</div>
          <div className="text-xs">Save details for future payouts</div>
        </Link>

        {filtered.map((r) => {
          const acctLast4 = (r.account_number || "").replace(/\s/g, "").slice(-4);
          return (
            <div key={r.id} className="group relative bg-white rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: "var(--splash-border)" }} data-testid={`recipient-card-${r.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: avatarColor(r.name) }}>{initials(r.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold tracking-tight truncate">{r.name}</div>
                  <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--splash-muted)" }}>
                    <span>🇵🇭</span><span className="truncate">{r.bank?.split(" (")[0]}</span>
                  </div>
                  <div className="text-xs mono mt-0.5" style={{ color: "var(--splash-muted)" }}>•••• {acctLast4}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button data-testid={`recipient-menu-${r.id}`} className="p-1.5 rounded hover:bg-slate-100"><MoreHorizontal size={16} /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.info("Edit (demo)")}><Edit3 size={12} className="mr-2"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => remove(r.id)} className="text-red-600"><Trash2 size={12} className="mr-2"/>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-xs" style={{ borderColor: "var(--splash-border)" }}>
                <div>
                  <div style={{ color: "var(--splash-muted)" }}>Last sent</div>
                  <div className="tabular-nums font-medium mt-0.5">
                    {r.last_amount_myr ? `${formatMYR(r.last_amount_myr)}` : "—"}
                  </div>
                  <div className="tabular-nums" style={{ color: "var(--splash-muted)" }}>{r.last_sent_at ? `on ${formatDate(r.last_sent_at)}` : "Never"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--splash-muted)" }}>Total sent</div>
                  <div className="tabular-nums font-medium mt-0.5">{formatMYR(r.total_sent_myr || 0)}</div>
                  <div className="tabular-nums" style={{ color: "var(--splash-muted)" }}>{r.total_count || 0} payments</div>
                </div>
              </div>

              <Link to="/send" data-testid={`send-to-${r.id}`}
                className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-white inline-flex items-center justify-center gap-1.5 transition opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: "var(--splash-green)" }}>
                <Send size={13} /> Send payment
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
