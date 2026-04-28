import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, Send, ArrowLeftRight, Users, FileSpreadsheet, LogOut, ChevronDown, ExternalLink } from "lucide-react";
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

const SUI_PACKAGE_ID = process.env.REACT_APP_SUI_PACKAGE_ID || "0xbfd9b35318e8588d45c9f1ce161da10462c61b40377e7f8c890196f5cba4ca51";
const SUI_EXPLORER_URL = `https://suiscan.xyz/testnet/object/${SUI_PACKAGE_ID}`;

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
        className={`${mobileOpen ? "block" : "hidden"} md:flex fixed md:relative z-30 w-64 flex-shrink-0 flex-col`}
        style={{
          backgroundColor: "var(--splash-navy)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100vh",
          position: "sticky",
          top: 0,
        }}
        data-testid="app-sidebar"
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 flex-shrink-0">
          <img
            src="/splash-logo.svg"
            alt="Splash"
            className="h-9 w-9 rounded-lg object-cover"
            style={{ backgroundColor: "#000" }}
          />
          <div>
            <div className="text-white font-semibold text-lg tracking-tight">Splash</div>
            <div className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>MY → PH PAYOUTS</div>
          </div>
        </div>

        {/* Nav — flex-1 so it fills space */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
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

        {/* Footer — always at bottom */}
        <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Sui Explorer link */}
          <a
            href={SUI_EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mx-3 my-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <ExternalLink size={12} />
            <span className="truncate">View on Sui Explorer</span>
          </a>

          {/* User info */}
          <div className="px-4 pb-5 pt-2 flex items-center gap-3 text-white">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: avatarColor(user?.name || "") }}
            >
              {initials(user?.name || "U")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{user?.company || user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded hover:bg-white/10 transition flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b bg-white flex-shrink-0" style={{ borderColor: "var(--splash-border)" }}>
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
              <DropdownMenuItem asChild>
                <a href={SUI_EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600">
                  <ExternalLink size={14} /> View Contract on Sui Explorer
                </a>
              </DropdownMenuItem>
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
