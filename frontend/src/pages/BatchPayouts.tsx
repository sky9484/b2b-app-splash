import React, { useState, useEffect } from 'react';
import { Upload, FileDown, Info, CheckCircle2, History, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type Step = 'upload' | 'preview' | 'progress';

interface RecipientRow {
  id: string;
  name: string;
  bank: string;
  account: string;
  amount: number;
  reference: string;
  valid: boolean;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

const MOCK_ROWS: RecipientRow[] = [
  { id: '1', name: 'Juan Dela Cruz', bank: 'BDO Unibank', account: '004522198847', amount: 2500, reference: 'INV-001', valid: true, status: 'pending' },
  { id: '2', name: 'Maria Clara Santos', bank: 'BPI', account: '123456789012', amount: 1800, reference: 'INV-002', valid: true, status: 'pending' },
  { id: '3', name: 'Jose Rizal Reyes', bank: 'Metrobank', account: '9984', amount: 450, reference: 'BONUS', valid: false, error: 'Invalid account number', status: 'pending' },
  { id: '4', name: 'Ana Marie Garcia', bank: 'UnionBank', account: '109438882112', amount: 45000, reference: 'SALARY', valid: true, status: 'pending' },
  { id: '5', name: 'Carlos Miguel Mendoza', bank: 'GCash', account: '09175551234', amount: 50, reference: 'REIMBURSE', valid: false, error: 'Amount below RM 100', status: 'pending' },
  { id: '6', name: 'Sofia Isabel Torres', bank: 'PayMaya', account: '09184445678', amount: 12000, reference: 'CONTRACT', valid: true, status: 'pending' },
  { id: '7', name: 'Miguel Angel Ramos', bank: 'RCBC', account: '5561992001', amount: 8400, reference: 'INV-007', valid: true, status: 'pending' },
];

export default function BatchPayouts() {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<RecipientRow[]>(MOCK_ROWS);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;
  const totalAmount = rows.filter(r => r.valid).reduce((acc, r) => acc + r.amount, 0);
  const platformFee = totalAmount * 0.015;
  const totalToPay = totalAmount + platformFee;

  const completedCount = rows.filter(r => r.status === 'completed').length;

  useEffect(() => {
    if (step === 'progress') {
      // Simulate real-time progress
      let currentRows = [...rows];
      let delay = 0;
      
      const updateRow = (index: number, newStatus: RecipientRow['status']) => {
        setTimeout(() => {
          setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], status: newStatus };
            return next;
          });
        }, delay);
      };

      currentRows.forEach((row, i) => {
        if (!row.valid) return;
        
        delay += 500;
        updateRow(i, 'processing');
        
        delay += 1500 + Math.random() * 1000;
        updateRow(i, 'completed');
      });
      
      const totalDelay = delay + 1000;
      setTimeout(() => setIsProcessing(false), totalDelay);
    }
  }, [step]);

  const handleUpload = () => {
    toast.success('File uploaded successfully');
    setStep('preview');
  };

  const handleApprove = () => {
    if (invalidCount > 0) {
      toast.error('Please fix invalid recipients before proceeding');
      return;
    }
    setStep('progress');
    setIsProcessing(true);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Batch Payouts</h1>
          {step === 'upload' && <p className="text-gray-500">Process up to 30 payments in as little as 5 minutes.</p>}
          {step === 'preview' && <p className="text-gray-500">Review your payout batch before confirming.</p>}
          {step === 'progress' && <p className="text-gray-500">Your payments are being processed.</p>}
        </div>
        {step !== 'upload' && (
          <Button variant="outline" onClick={() => setStep('upload')} disabled={isProcessing}>
             Start New Batch
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Info Banner */}
            <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-xl flex gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-100">
                <Info size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  Upload a CSV with your recipients. We'll process them all at once with one single FPX bank transfer.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1.5 focus:outline-none">
                    <FileDown size={14} /> Download CSV Template
                  </button>
                  <span className="w-1 h-1 bg-blue-200 rounded-full" />
                  <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline focus:outline-none">View File Guidelines</button>
                </div>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div 
              onClick={handleUpload}
              className="p-12 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-6 hover:border-cyan-500 hover:bg-cyan-50/30 transition-all group cursor-pointer bg-white"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-cyan-500 group-hover:text-white transition-all transform group-hover:-translate-y-1 group-hover:shadow-lg">
                <Upload size={32} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-gray-900 leading-none">Drag CSV here or click to browse</h3>
                <p className="text-sm text-gray-500">Maximum file size: 5MB</p>
              </div>
              <Button type="button" variant="secondary" className="mt-2 pointer-events-none">
                Browse Files
              </Button>
            </div>

            {/* CSV Format Reference */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Required CSV Format</h3>
              <div className="bg-gray-900 rounded-xl p-6 relative overflow-hidden group">
                <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
                  {`name,country,bank,account,amount,reference\nJuan Dela Cruz,PH,BDO,004522198847,2500,INV-001\nMaria Santos,PH,BPI,123456789012,1800,INV-002`}
                </pre>
                <button className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-md transition-all text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 focus:outline-none">
                  Copy Format
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 flex flex-col gap-1 col-span-2 bg-gray-50/50">
                <span className="text-sm font-medium text-gray-500">Recipients</span>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <CheckCircle2 size={18} />
                    <span>{validCount} valid</span>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-1.5 text-red-600 font-medium">
                      <XCircle size={18} />
                      <span>{invalidCount} invalid (fix required)</span>
                    </div>
                  )}
                </div>
              </Card>
              <Card className="p-4 flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-500">Total Amount</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount, 'MYR')}</span>
              </Card>
              <Card className="p-4 flex flex-col gap-1 border-cyan-200 bg-cyan-50/30">
                <span className="text-sm font-medium text-gray-500">Total to Pay (inc. fees)</span>
                <span className="text-lg font-bold text-cyan-900">{formatCurrency(totalToPay, 'MYR')}</span>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">Status</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className={cn(!row.valid && "bg-red-50/30")}>
                      <TableCell className="text-center">
                        {row.valid ? (
                          <div className="flex justify-center text-green-500">
                            <CheckCircle2 size={18} />
                          </div>
                        ) : (
                          <div className="flex justify-center text-red-500">
                            <XCircle size={18} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.reference}</div>
                      </TableCell>
                      <TableCell className="text-gray-600">{row.bank}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-gray-700">{row.account}</span>
                        {!row.valid && row.error && (
                          <div className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                            {row.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(row.amount, 'MYR')}
                      </TableCell>
                      <TableCell>
                        {!row.valid && (
                           <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-red-600" onClick={() => removeRow(row.id)}>
                             Remove
                           </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold"
                disabled={invalidCount > 0}
                onClick={handleApprove}
              >
                Approve all & pay via FPX
                <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="p-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">
                  {isProcessing ? 'Processing batch...' : 'Batch completed!'}
                </h3>
                <p className="text-gray-500 font-medium">
                  {completedCount} of {validCount} transfers completed
                </p>
              </div>
              
              <div className="w-full max-w-md mx-auto bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isProcessing ? "bg-cyan-500" : "bg-green-500"
                  )}
                  style={{ width: `${(completedCount / validCount) * 100}%` }}
                />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.filter(r => r.valid).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.bank}</div>
                      </TableCell>
                      <TableCell>
                         <span className="font-mono text-sm text-gray-700">{row.account}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(row.amount, 'MYR')}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.status === 'pending' && <Badge variant="secondary" className="text-gray-500 bg-gray-100">Pending</Badge>}
                        {row.status === 'processing' && (
                          <Badge variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50 gap-1.5 pr-3">
                            <Loader2 size={12} className="animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {row.status === 'completed' && (
                          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <Badge className="bg-green-100 hover:bg-green-100 text-green-700 gap-1 pr-3 border-transparent">
                              <CheckCircle2 size={12} />
                              Sent
                            </Badge>
                          </motion.div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
