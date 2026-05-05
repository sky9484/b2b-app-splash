import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { 
  LayoutDashboard, 
  Send as SendIcon, 
  History, 
  Users, 
  FileStack, 
  Settings, 
  LogOut,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

// ... (SidebarItem stays same)
interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

function SidebarItem({ to, icon: Icon, label, onClick }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium",
        isActive 
          ? "bg-accent-cyan text-white shadow-md shadow-accent-cyan/20" 
          : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kycStatus, setKycStatus] = useState<'verified' | 'pending'>('verified');

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Derive initials from user name or company
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.company
    ? user.company.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AS';
  const displayName = user?.company || user?.name || 'Acme Sdn Bhd';
  const displayEmail = user?.email || 'admin@acme.com';
  
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/send') return 'Send Payout';
    if (path === '/transfers') return 'Transfers';
    if (path === '/recipients') return 'Recipients';
    if (path === '/batch') return 'Batch Payouts';
    if (path === '/settings') return 'Settings';
    return 'Dashboard';
  };

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="flex h-screen bg-bg-light overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-primary-navy/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-primary-navy text-white flex flex-col fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:h-screen shrink-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase text-white">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full translate-x-1" />
            </div>
            <span>SPLASH</span>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-4 mb-2 mt-4">Main Menu</div>
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
          <SidebarItem to="/send" icon={SendIcon} label="Send Payout" onClick={() => setMobileMenuOpen(false)} />
          <SidebarItem to="/transfers" icon={History} label="Transfers" onClick={() => setMobileMenuOpen(false)} />
          <SidebarItem to="/recipients" icon={Users} label="Recipients" onClick={() => setMobileMenuOpen(false)} />
          <SidebarItem to="/batch" icon={FileStack} label="Batch Payouts" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-4 mb-2 mt-8">Account</div>
          <SidebarItem to="/settings" icon={Settings} label="Settings" onClick={() => setMobileMenuOpen(false)} />
        </nav>

        <div className="p-4 mt-auto border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{displayName}</div>
              <div className="text-xs text-white/40 truncate">{displayEmail}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-20 bg-white border-b border-border-base flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={toggleMenu} className="lg:hidden text-text-muted hover:text-text-dark">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-text-muted hidden sm:flex">
              <Link to="/" className="hover:text-primary-navy transition-colors">Home</Link>
              <ChevronRight size={16} />
              <span className="text-text-dark font-semibold">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary-navy hover:bg-gray-100 rounded-full transition-colors">
              <Search size={18} />
            </button>
            <div className={cn(
              "px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer",
              kycStatus === 'verified' 
                ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            )}
            onClick={() => setKycStatus(prev => prev === 'verified' ? 'pending' : 'verified')}
            title="Click to toggle KYC status (Demo)"
            >
              {kycStatus === 'verified' ? (
                <CheckCircle2 size={14} className="text-green-600" />
              ) : (
                <AlertTriangle size={14} className="text-amber-600" />
              )}
              {kycStatus === 'verified' ? 'Verified' : 'Pending KYC'}
            </div>
            <button className="text-text-muted hover:text-primary-navy transition-colors relative">
              <Bell size={20} />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white">2</div>
            </button>
            <div className="h-8 w-px bg-border-base" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-text-dark leading-none group-hover:text-accent-cyan transition-colors">{displayName}</div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Business Account</div>
              </div>
              <div className="w-10 h-10 bg-primary-navy rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
