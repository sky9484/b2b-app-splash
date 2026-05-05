import React, { useState } from 'react';
import { Search, ChevronDown, Download, FileText, RotateCcw, Eye, Filter } from 'lucide-react';
import { MOCK_TRANSFERS } from '../mockData';
import { formatCurrency, formatDateLong, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Transfers() {
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();
  
  const filters = ['All', 'Completed', 'Pending', 'Failed'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-dark tracking-tight">Transfer History</h1>
          <p className="text-text-muted mt-1">Manage and track all your cross-border payments.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                filter === f ? "bg-white text-primary-navy shadow-sm" : "text-text-muted hover:text-text-dark"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-border-base px-4 py-2 rounded-lg text-sm font-medium text-text-dark hover:bg-gray-50 cursor-pointer shadow-sm">
            <Filter size={16} />
            <span>Last 30 days</span>
            <ChevronDown size={14} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-border-base px-4 py-2 rounded-lg text-sm font-medium text-text-dark hover:bg-gray-50 cursor-pointer shadow-sm">
            <Search size={16} />
            <input type="text" placeholder="Search by recipient..." className="bg-transparent outline-none border-none text-sm w-48" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-border-base">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Reference</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Recipient</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Bank</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">You sent</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-right">They received</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted text-center italic">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {MOCK_TRANSFERS.filter(t => filter === 'All' || t.status === filter).map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-text-dark tabular-nums whitespace-nowrap">{formatDateLong(transfer.date)}</td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-mono font-medium text-text-muted uppercase bg-gray-100 px-2 py-1 rounded">
                      {transfer.reference}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇵🇭</span>
                      <div className="text-sm font-bold text-text-dark group-hover:text-accent-cyan transition-colors truncate">
                        {transfer.recipientName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-text-muted">{transfer.recipientBank}</td>
                  <td className="px-6 py-4 text-sm font-bold text-text-dark text-right tabular-nums">
                    {formatCurrency(transfer.sentAmount, transfer.sentCurrency)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-text-muted text-right tabular-nums">
                    {formatCurrency(transfer.receivedAmount, transfer.receivedCurrency)}
                  </td>
                  <td className="px-6 py-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div
                        key={transfer.status}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={
                          transfer.status === 'Pending'
                            ? { opacity: [0.6, 1, 0.6], scale: 1, transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
                            : { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } }
                        }
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 w-fit border",
                          transfer.status === 'Completed' ? "bg-green-50 text-green-700 border-green-200" :
                          transfer.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          transfer.status === 'Completed' ? "bg-green-500" :
                          transfer.status === 'Pending' ? "bg-amber-500" :
                          "bg-red-500"
                        )} />
                        {transfer.status}
                      </motion.div>
                    </AnimatePresence>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                       {transfer.status === 'Failed' ? (
                         <button 
                           onClick={() => navigate('/send', { state: { retryTransfer: transfer } })}
                           className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors group/btn relative"
                         >
                           <RotateCcw size={16} />
                           <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-text-dark text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap font-bold uppercase tracking-wider">Retry Payment</span>
                         </button>
                       ) : (
                         <>
                           <button className="p-2 hover:bg-blue-50 text-accent-cyan rounded-lg transition-colors group/btn relative">
                             <Eye size={16} />
                             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-text-dark text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap font-bold uppercase tracking-wider">View Transfer</span>
                           </button>
                           <button className="p-2 hover:bg-gray-100 text-text-muted hover:text-text-dark rounded-lg transition-colors group/btn relative text-[10px] font-black uppercase">
                             <Download size={16} />
                             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-text-dark text-white text-[10px] rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap font-bold uppercase tracking-wider">Download PDF</span>
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-white px-6 py-4 border-t border-border-base flex items-center justify-between">
          <div className="text-sm font-medium text-text-muted">
            Showing <span className="font-bold text-text-dark">1-20</span> of <span className="font-bold text-text-dark">156</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, '...', 8].map((n, i) => (
              <button 
                key={i} 
                className={cn(
                  "w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-all",
                  n === 1 ? "bg-primary-navy text-white shadow-md shadow-primary-navy/20" : "hover:bg-gray-100 text-text-muted"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
