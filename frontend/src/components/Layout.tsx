import { useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Send, ArrowLeftRight, Users, FileSpreadsheet, LogOut, ChevronDown, ExternalLink, LucideIcon } from "lucide-react";
import { initials, avatarColor } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard",    icon: LayoutDashboard, end: true },
  { to: "/send",      label: "Send Payout",  icon: Send },
  { to: "/transfers", label: "Transfers",    icon: ArrowLeftRight },
  { to: "/recipients",label: "Recipients",   icon: Users },
  { to: "/batch",     label: "Batch Payouts",icon: FileSpreadsheet },
];

const SUI_PACKAGE_ID = process.env.REACT_APP_SUI_PACKAGE_ID ?? "0xbfd9b35318e8588d45c9f1ce161da10462c61b40377e7f8c890196f5cba4ca51";
const SUI_EXPLORER_URL = `https://suiscan.xyz/testnet/object/${SUI_PACKAGE_ID}`;

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const userName    = typeof user === "object" && user ? user.name    : "";
  const userEmail   = typeof user === "object" && user ? user.email   : "";
  const userCompany = typeof user === "object" && user ? user.company : "";

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page)', width: '100%' }}>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 30,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Deep Indigo */}
      <aside
        style={{
          width: '220px',
          background: 'var(--sidebar)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          flexShrink: 0,
          boxShadow: 'var(--shadow-sidebar)',
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 40,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease',
        }}
        className={`md:relative md:translate-x-0 md:position-static`}
        data-testid="app-sidebar"
      >
        {/* Logo area */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <img src="/splash-logo.svg" alt="Splash" style={{
            width: '32px', height: '32px', borderRadius: '8px',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, lineHeight: 1.2 }}>
              Splash
            </div>
            <div style={{ color: 'var(--sidebar-text)', fontSize: '11px', opacity: 0.7 }}>
              MY → PH
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  marginBottom: '2px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  transition: 'all 100ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom — user + Sui contract link */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '8px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600,
              color: '#FFFFFF',
              flexShrink: 0,
            }}>
              {initials(userName)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || "User"}
              </div>
              <div style={{ color: 'var(--sidebar-text)', fontSize: '11px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userCompany || userEmail}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                padding: '5px', borderRadius: '5px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--sidebar-text)', flexShrink: 0,
                transition: 'all 100ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-text)'; }}
            >
              <LogOut size={13} />
            </button>
          </div>
          <a href={SUI_EXPLORER_URL} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', marginTop: '4px',
            color: 'var(--sidebar-text)', fontSize: '11px',
            textDecoration: 'none', borderRadius: '6px',
            opacity: 0.7,
            transition: 'opacity 100ms ease',
          }}>
            ↗ Sui contract
          </a>
        </div>
      </aside>

      {/* Main */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: 0, 
        width: '100%',
        marginLeft: 0,
      }}
      className="md:ml-0"
      >

        {/* Topbar */}
        <header style={{
          height: '56px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--outline)',
          flexShrink: 0,
          width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              className="md:hidden"
              style={{ padding: '6px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', flexShrink: 0 }}
              onClick={() => setMobileOpen(s => !s)}
              aria-label="Toggle menu"
              data-testid="mobile-menu-toggle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div style={{ fontSize: '13px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Welcome, <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{userName?.split(" ")[0] || "there"}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="user-menu-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '5px 10px', borderRadius: '7px', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                  color: 'white', fontWeight: 500,
                  backgroundColor: avatarColor(userName),
                }}>
                  {initials(userName)}
                </div>
                <ChevronDown size={12} style={{ color: 'var(--ink-3)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{userName}</div>
                <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }}>{userEmail}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={SUI_EXPLORER_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--ink-2)' }}>
                  <ExternalLink size={12} /> View Contract on Sui
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="logout-button" className="text-[var(--danger)] text-xs">
                <LogOut size={12} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main style={{ 
          flex: 1, 
          padding: '16px', 
          overflowY: 'auto', 
          overflowX: 'hidden',
          width: '100%', 
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
