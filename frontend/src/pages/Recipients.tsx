import React from 'react';
import { Search, Plus, MoreVertical, Send, Edit2, Trash2, ArrowUpRight, Users } from 'lucide-react';
import { MOCK_RECIPIENTS } from '../mockData';
import { cn, formatCurrency } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Recipients() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-dark tracking-tight">Recipients</h1>
          <p className="text-text-muted mt-1">Manage your international payees and bank details.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-border-base px-4 py-2 rounded-lg text-sm font-medium text-text-dark hover:bg-gray-50 cursor-pointer shadow-sm">
            <Search size={16} />
            <input type="text" placeholder="Search recipients..." className="bg-transparent outline-none border-none text-sm w-48" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-border-base px-4 py-2 rounded-lg text-sm font-medium text-text-dark hover:bg-gray-50 cursor-pointer shadow-sm italic">
            <span>Sort by: Recent</span>
            <ArrowUpRight size={14} className="opacity-40" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Add New Recipient Card */}
        <button className="flex flex-col items-center justify-center gap-4 h-[280px] bg-white border-2 border-dashed border-border-base rounded-xl hover:border-accent-cyan hover:bg-accent-cyan/5 transition-all group">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-text-muted group-hover:bg-accent-cyan group-hover:text-white transition-all transform group-hover:scale-110">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <div className="font-bold text-text-dark">Add new recipient</div>
            <div className="text-xs text-text-muted font-medium mt-1 uppercase tracking-widest tracking-tighter">New Bank Account</div>
          </div>
        </button>

        {/* Recipient Cards */}
        {MOCK_RECIPIENTS.map((recipient) => (
          <div 
            key={recipient.id} 
            onClick={() => navigate(`/send?recipient=${recipient.id}`)}
            className="card p-6 flex flex-col justify-between group relative overflow-hidden h-[280px] hover:shadow-xl hover:shadow-primary-navy/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-sm",
                  recipient.color
                )}>
                  {recipient.initials}
                </div>
                <div 
                  className="relative group/menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-text-muted">
                    <MoreVertical size={18} />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-border-base rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                    <button className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-2">
                       <Edit2 size={12} /> Edit
                    </button>
                    <button className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-red-50 text-red-500 flex items-center gap-2">
                       <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-text-dark text-lg leading-none group-hover:text-accent-cyan transition-colors">{recipient.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🇵🇭</span>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wider">{recipient.bank}</div>
                </div>
                <div className="text-[11px] font-mono text-text-muted font-bold tracking-widest uppercase mt-2">
                  Account: {recipient.accountNumber}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border-base pt-4">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Last sent</div>
                <div className="text-sm font-bold text-text-dark tabular-nums">
                  {recipient.lastSentAmount ? formatCurrency(recipient.lastSentAmount, 'MYR') : '-'}
                </div>
                <div className="text-[9px] font-bold text-text-muted/60 uppercase">{recipient.lastSentDate || '-'}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Total sent</div>
                <div className="text-sm font-bold text-text-dark tabular-nums">
                  {formatCurrency(recipient.totalSent, 'MYR')}
                </div>
                <div className="text-[9px] font-bold text-text-muted/60 uppercase">{recipient.paymentCount} payments</div>
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-white via-white/95 to-white/80 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/send?recipient=${recipient.id}`);
                }}
                className="btn-primary w-full shadow-lg shadow-success-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Send payment
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty State */}
      {MOCK_RECIPIENTS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-border-base border-dashed">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-text-muted mb-6">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-bold text-text-dark">No recipients selected</h3>
          <p className="text-text-muted mt-2 max-w-sm text-center font-medium">Add your first recipient to start sending lightning-fast payouts to the Philippines.</p>
          <button className="btn-primary mt-8">
            <Plus size={18} /> Add Recipient
          </button>
        </div>
      )}
    </div>
  );
}
