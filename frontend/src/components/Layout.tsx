import { useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Send, ArrowLeftRight, Users, FileSpreadsheet, LogOut, Bell, Code2, Settings, LucideIcon } from "lucide-react";
import { initials, avatarColor } from "@/lib/api";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number | null;
}

const NAV_MAIN: NavItem[] = [
  { to: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard, end: true },
  { to: "/send",       label: "Send",        icon: Send },
  { to: "/batch",      label: "Batch",       icon: FileSpreadsheet },
  { to: "/transfers",  label: "History",     icon: ArrowLeftRight },
  { to: "/recipients", label: "Recipients",  icon: Users },
];

const NAV_DEV: NavItem[] = [
  { to: "/transfers", label: "API & webhooks", icon: Code2 },
  { to: "/dashboard", label: "Settings",       icon: Settings },
];

const SUI_PACKAGE_ID = process.env.REACT_APP_SUI_PACKAGE_ID ?? "0xbfd9b35318e8588d45c9f1ce161da10462c61b40377e7f8c890196f5cba4ca51";
const SUI_EXPLORER_URL = `https://suiscan.xyz/testnet/object/${SUI_PACKAGE_ID}`;

// Page title map for breadcrumb
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/send":       "Send",
  "/batch":      "Batch",
  "/transfers":  "History",
  "/recipients": "Recipients",
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const userName    = typeof user === "object" && user ? (user as any).name    : "";
  const userEmail   = typeof user === "object" && user ? (user as any).email   : "";
  const userCompany = typeof user === "object" && user ? (user as any).company : "";

  const currentPage = PAGE_TITLES[location.pathname] || "Dashboard";

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page)', width: '100%', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: '200px',
          background: 'var(--sidebar)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'fixed',
          left: 0, top: 0,
          height: '100vh',
          zIndex: 40,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease',
        }}
        className="md:relative md:translate-x-0"
        data-testid="app-sidebar"
      >
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <img src="/splash-logo.svg" alt="Splash" style={{ width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>Splash</div>
            <div style={{ color: 'rgba(199,196,240,0.7)', fontSize: '10px', marginTop: '1px' }}>B2B PAYOUTS · MY → PH</div>
          </div>
        </div>

        {/* Main nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  height: '36px', padding: '0 10px', borderRadius: '7px', marginBottom: '1px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: active ? 500 : 400,
                  color: active ? '#FFFFFF' : 'rgba(199,196,240,0.8)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'all 100ms ease',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(199,196,240,0.8)'; } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Icon size={14} strokeWidth={2} />
                  {item.label}
                </span>
                {item.badge != null && (
                  <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', padding: '1px 6px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Developer section */}
          <div style={{ marginTop: '20px', marginBottom: '6px', padding: '0 10px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(199,196,240,0.4)', textTransform: 'uppercase' }}>
            Developer
          </div>
          {NAV_DEV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  height: '36px', padding: '0 10px', borderRadius: '7px', marginBottom: '1px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: active ? 500 : 400,
                  color: active ? '#FFFFFF' : 'rgba(199,196,240,0.8)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'all 100ms ease',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(199,196,240,0.8)'; } }}
              >
                <Icon size={14} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — user */}
        <div style={{ padding: '10px 8px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, color: '#FFFFFF', flexShrink: 0,
              backgroundColor: avatarColor(userName),
            }}>
              {initials(userName)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || "User"}
              </div>
              <div style={{ color: 'rgba(199,196,240,0.6)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userCompany || userEmail}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{ padding: '4px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(199,196,240,0.6)', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(199,196,240,0.6)'; }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>

        {/* Topbar */}
        <header style={{
          height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--outline)',
          flexShrink: 0,
        }}>
          {/* Left: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <button
              className="md:hidden"
              style={{ padding: '5px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)' }}
              onClick={() => setMobileOpen(s => !s)}
              aria-label="Toggle menu"
              data-testid="mobile-menu-toggle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{currentPage}</span>
              <span style={{ color: 'var(--ink-4)' }}>/</span>
              <span style={{ color: 'var(--ink-3)' }}>MY Malaysia</span>
              <span style={{ color: 'var(--ink-4)' }}>→</span>
              <span style={{ color: 'var(--ink-3)' }}>PH Philippines</span>
            </nav>
          </div>

          {/* Right: badges + bell + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sandbox badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '20px',
              backgroundColor: 'var(--success-bg)', color: 'var(--success)',
              border: '1px solid var(--success-border)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
              Sandbox
            </span>
            {/* BNM Track badge */}
            <span style={{
              fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '20px',
              backgroundColor: 'var(--raised)', color: 'var(--ink-3)',
              border: '1px solid var(--outline)',
            }}>
              BNM Track
            </span>
            {/* Bell */}
            <button style={{ padding: '5px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)' }}>
              <Bell size={15} />
            </button>
            {/* Avatar */}
            <button
              data-testid="user-menu-button"
              onClick={handleLogout}
              title="Sign out"
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 600, color: 'white', border: 'none', cursor: 'pointer',
                backgroundColor: avatarColor(userName),
              }}
            >
              {initials(userName)}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, padding: '20px 24px',
          overflowY: 'auto', overflowX: 'hidden',
          width: '100%', maxWidth: '100%',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
