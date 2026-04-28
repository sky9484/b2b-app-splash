import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, Send, ArrowLeftRight, Users, FileSpreadsheet, LogOut, ChevronDown } from "lucide-react";
import { initials, avatarColor } from "../lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/send", label: "Send Payout", icon: Send },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/recipients", label: "Recipients", icon: Users },
  { to: "/batch", label: "Batch Payouts", icon: FileSpreadsheet },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--splash-bg)" }}>
      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "block" : "hidden"} md:block fixed md:relative z-30 w-64 h-screen border-r flex-shrink-0`}
        style={{ backgroundColor: "var(--splash-navy)", borderColor: "rgba(255,255,255,0.06)" }}
        data-testid="app-sidebar"
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--splash-cyan)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-lg tracking-tight">Splash</div>
              <div className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>MY → PH PAYOUTS</div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(34,167,240,0.16)" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.72)",
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pb-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 text-white">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: avatarColor(user?.name || "") }}>
                {initials(user?.name || "U")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
                <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{user?.company || user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b bg-white" style={{ borderColor: "var(--splash-border)" }}>
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded hover:bg-slate-100"
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle menu"
              data-testid="mobile-menu-toggle"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
            <div className="text-sm" style={{ color: "var(--splash-muted)" }}>
              <span className="hidden sm:inline">Welcome back, </span>
              <span style={{ color: "var(--splash-text)", fontWeight: 600 }}>{user?.name?.split(" ")[0] || "there"}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu-button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: avatarColor(user?.name || "") }}>
                  {initials(user?.name || "U")}
                </div>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs font-normal text-slate-500">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="logout-button" className="text-red-600">
                <LogOut size={14} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-6 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
