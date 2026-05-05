import React from 'react';
import { TrendingUp, Users, Clock, DollarSign, ArrowRight, Lightbulb, Upload } from 'lucide-react';
import { MOCK_TRANSFERS } from '../mockData';
import { formatCurrency, formatDateShort, cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps) {
  // Extract base color identifier, e.g. from bg-blue-100 get blue
  const baseColor = color.includes('blue') ? 'stat-blue' : 
                    color.includes('purple') ? 'stat-cyan' :
                    color.includes('green') ? 'stat-green' : 'stat-amber';

  const trendColor = trend?.includes('+') || trend?.includes('up') ? 'up' : 'down';
  
  return (
    <div className={cn("stat-card", baseColor)}>
      <div className="flex justify-between items-start mb-2">
        <div className="stat-label mb-0">{label}</div>
        <Icon size={14} className="text-ink-4" />
      </div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className={cn("stat-sub", trendColor)}>
          {trend}
        </div>
      )}
    </div>
  );
}

function FXLive() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const base = 12.9822;
  const jitter = ((Math.sin(tick * 0.7) * 0.0006) + 1);
  const v = base * jitter;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between items-center py-1">
        <div className="flex items-center gap-2">
          <span className="inline-grid place-items-center w-[22px] h-[22px] rounded-md bg-white/10 text-[13px] leading-none">🇲🇾</span>
          <span className="text-[13px] text-white/80">1 MYR =</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-semibold tabular-nums">{v.toFixed(4)} PHP</span>
          <span className="text-[11px] text-ok font-mono">+0.04%</span>
        </div>
      </div>
      <div className="flex justify-between items-center py-1 text-xs">
        <span className="text-white/50">Spread (locked)</span>
        <span className="font-mono text-white/80 tabular-nums">52 bps</span>
      </div>
      <div className="flex justify-between items-center py-1 text-xs">
        <span className="text-white/50">Total cost</span>
        <span className="font-mono text-white/80 tabular-nums">105 bps</span>
      </div>
      <div className="flex justify-between items-center py-1 text-xs">
        <span className="text-white/50">USDC peg (Pyth)</span>
        <span className="font-mono text-ok tabular-nums">$1.0001 ✓</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const totalSentThisMonth = MOCK_TRANSFERS
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.sentAmount, 0);

  const pendingCount = MOCK_TRANSFERS.filter(t => t.status === 'Pending').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-dark tracking-tight">Dashboard</h1>
          <p className="text-text-muted mt-1">Welcome back, Daniel. Here's your payment activity.</p>
        </div>
        <div className="text-sm text-text-muted font-medium bg-white px-4 py-2 rounded-lg border border-border-base shadow-sm">
          Last updated: Today at 2:34 PM
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={DollarSign} 
          label="Total sent this month" 
          value={formatCurrency(totalSentThisMonth, 'MYR')} 
          trend="+12% this month"
          color="bg-blue-100 text-blue-600"
        />
        <StatCard 
          icon={Users} 
          label="Active recipients" 
          value="12" 
          color="bg-purple-100 text-purple-600"
        />
        <StatCard 
          icon={Clock} 
          label="Pending transfers" 
          value={pendingCount.toString()} 
          color="bg-amber-100 text-amber-600"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Avg. settlement time" 
          value="3m 42s" 
          color="bg-green-100 text-green-600"
        />
      </div>

      <div className="flex gap-8 flex-col xl:flex-row">
        {/* Main Content Column */}
        <div className="flex-1 space-y-8">
          
          {/* Recent Transfers Table */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink tracking-tight">Recent Transfers</h2>
              {MOCK_TRANSFERS.length > 0 && (
                <Link to="/transfers" className="btn-ghost !h-7 !px-2 !text-xs">View all <ArrowRight size={12} className="ml-1" /></Link>
              )}
            </div>
          
          <div className="card overflow-hidden">
            {MOCK_TRANSFERS.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <Clock className="text-gray-300" size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-text-dark">No recent activity</h3>
                  <p className="text-sm font-medium text-text-muted">Send your first payout to get started.</p>
                </div>
                <Link to="/send" className="btn-primary mt-4">
                  Send a payout
                </Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-border-base">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Date & Time</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Recipient</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">You sent</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">They received</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base">
                  {MOCK_TRANSFERS.slice(0, 8).map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-text-dark tabular-nums whitespace-nowrap">
                        {formatDateShort(transfer.date)}
                      </td>
                      <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🇵🇭</span>
                        <div className="text-sm font-bold text-text-dark group-hover:text-accent-cyan transition-colors">{transfer.recipientName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-text-dark text-right tabular-nums">
                      {formatCurrency(transfer.sentAmount, transfer.sentCurrency)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-text-muted text-right tabular-nums">
                      {formatCurrency(transfer.receivedAmount, transfer.receivedCurrency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                        transfer.status === 'Completed' ? "bg-green-100 text-green-600" :
                        transfer.status === 'Pending' ? "bg-amber-100 text-amber-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-accent-cyan font-bold text-xs hover:underline uppercase tracking-widest">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <aside className="w-full xl:w-[320px] shrink-0 space-y-6">
          <div className="card p-6 space-y-6">
            <h3 className="text-lg font-bold text-text-dark leading-none">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/send" className="btn-primary w-full shadow-lg shadow-success-green/20 group">
                Send a payout
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/batch" className="btn-secondary w-full group">
                <Upload size={18} className="text-text-muted group-hover:text-text-dark transition-colors" />
                Upload batch CSV
              </Link>
            </div>
            
            <div className="p-4 bg-primary-navy/5 border border-primary-navy/10 rounded-lg flex gap-3">
              <div className="text-accent-cyan shrink-0 mt-0.5">
                <Lightbulb size={20} />
              </div>
              <p className="text-[13px] text-text-dark font-medium leading-relaxed">
                <span className="font-bold">Tip:</span> Batch payouts save 40% time for 10+ recipients.
              </p>
            </div>
          </div>

          <div className="card p-6 bg-primary-navy text-white relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-white/50">
                <span>Live FX · MYR → PHP</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-3 text-brand-2 bg-opacity-20 flex items-center gap-1.5 normal-case font-medium tracking-normal text-[11px] border border-brand/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  Pyth · 0.4s ago
                </span>
              </div>
              
              <FXLive />
              
              <div className="pt-4 border-t border-white/10 text-[10px] text-white/40 font-medium flex items-center gap-1.5">
                Switchboard fallback active · oracle deviation &lt; 30 bps
              </div>
            </div>
            {/* Background Accent */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </aside>
      </div>
    </div>
  );
}
