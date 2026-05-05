import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, ArrowLeft, Search, ChevronDown, Clock, Info, ExternalLink, PartyPopper } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/ui/dialog';

type Step = 1 | 2 | 3 | 4;

const BANKS = [
  'BDO Unibank', 'BPI', 'Metrobank', 'UnionBank', 'Land Bank', 
  'PNB', 'RCBC', 'Security Bank', 'Chinabank', 'GCash', 'PayMaya'
];

export default function SendPayout() {
  const location = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [recipientData, setRecipientData] = useState({
    fullName: '',
    bank: '',
    accountNumber: '',
    mobile: ''
  });
  const [touched, setTouched] = useState({
    fullName: false,
    bank: false,
    accountNumber: false,
  });
  const [amount, setAmount] = useState<string>('');
  const [countdown, setCountdown] = useState(30);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [stage, setStage] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const EXCHANGE_RATE = 12.9822;

  useEffect(() => {
    if (location.state?.retryTransfer) {
      const { retryTransfer } = location.state;
      setRecipientData(prev => ({
        ...prev,
        fullName: retryTransfer.recipientName || '',
        bank: retryTransfer.recipientBank || '',
      }));
      if (retryTransfer.sentAmount) {
        setAmount(retryTransfer.sentAmount.toString());
      }
      setTouched({
        fullName: true,
        bank: true,
        accountNumber: false,
      });
      // Clear the state so it doesn't re-apply if they refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Timer for Step 3
  useEffect(() => {
    if (step === 3 && countdown > 0) {
      const timer = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  // Payment timeline simulation
  useEffect(() => {
    if (step === 4) {
      setStage(1); // stage 1 instant

      const timers = [
        setTimeout(() => setStage(2), 30000), // after 30s
        setTimeout(() => setStage(3), 45000), // after 45s
        setTimeout(() => setStage(4), 90000), // after 90s
        setTimeout(() => setStage(5), 120000), // after 120s
      ];

      return () => timers.forEach(clearTimeout);
    }
  }, [step]);

  useEffect(() => {
    if (step === 4 && stage === 5) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0A2540', '#00D4FF', '#00E676']
      });
    }
  }, [step, stage]);

  const handleNext = () => setStep(prev => (prev < 4 ? (prev + 1) as Step : prev));
  const handleBack = () => setStep(prev => (prev > 1 ? (prev - 1) as Step : prev));

  const steps = [
    { id: 1, label: 'Recipient' },
    { id: 2, label: 'Amount' },
    { id: 3, label: 'Review' },
    { id: 4, label: 'Track' },
  ];

  const validate = () => {
    const errors = {
      fullName: '',
      bank: '',
      accountNumber: '',
    };
    if (touched.fullName && !recipientData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (touched.fullName && recipientData.fullName.length < 3) {
      errors.fullName = 'Please enter a valid full name';
    }

    if (touched.bank && !recipientData.bank) {
      errors.bank = 'Please select a bank';
    }

    if (touched.accountNumber) {
      const value = recipientData.accountNumber.trim();
      if (!value) {
        errors.accountNumber = 'Account number is required';
      } else {
        const digitsOnly = value.replace(/\s/g, '');
        if (/[^\d]/.test(digitsOnly)) {
          errors.accountNumber = 'Account number must contain only numbers';
        } else if (digitsOnly.length < 10) {
          errors.accountNumber = 'Account number is too short (minimum 10 digits)';
        } else if (digitsOnly.length > 12) {
          errors.accountNumber = 'Account number is too long (maximum 12 digits)';
        }
      }
    }
    return errors;
  };

  const errors = validate();
  const isStep1Valid = !errors.fullName && !errors.bank && !errors.accountNumber && recipientData.fullName.trim() !== '' && recipientData.bank !== '' && recipientData.accountNumber.trim() !== '';

  const handleProceedToStep2 = () => {
    setTouched({ fullName: true, bank: true, accountNumber: true });
    if (isStep1Valid) {
      handleNext();
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(val);
  };

  const getFormattedAmount = () => {
    if (!amount) return '';
    const parts = amount.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length === 2 ? `${integerPart}.${parts[1]}` : integerPart;
  };

  const handleAmountBlur = () => {
    if (amount && !isNaN(Number(amount))) {
      setAmount(Number(amount).toFixed(2));
    }
  };

  const parsedAmount = Number(amount) || 0;
  const platformFee = parsedAmount * 0.002;
  const fxSpread = parsedAmount * 0.012;
  const fixedFee = 4.50;
  const totalFees = platformFee + fxSpread + fixedFee;
  const totalPay = parsedAmount + totalFees;
  const recipientReceives = parsedAmount * EXCHANGE_RATE;

  const timelineStages = [
    { title: 'FPX payment received', desc: 'Your bank transfer completed successfully', done: stage > 1, active: stage === 1 },
    { title: 'MYR converted to USDC on Luno', desc: `${formatCurrency(totalPay, 'MYR')} → ${(totalPay / 4.7).toFixed(2)} USDC`, done: stage > 2, active: stage === 2 },
    { title: 'USDC settled on Sui blockchain', desc: 'Settlement hash: 0xab23...f891', done: stage > 3, active: stage === 3, mono: true },
    { title: 'USDC converted to PHP on Coins.ph', desc: `Processing ${(totalPay / 4.7).toFixed(2)} USDC → ${formatCurrency(recipientReceives, 'PHP')}`, done: stage > 4, active: stage === 4 },
    { title: "Sent to recipient's bank account", desc: stage === 5 ? 'Bank transfer confirmed' : 'Awaiting bank confirmation', done: stage === 5, active: false, future: stage < 5 },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-text-dark tracking-tight">Send a Payout</h1>
        <p className="text-text-muted">Fast, secure, and regulated cross-border transfers.</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between px-4 max-w-xl mx-auto">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 relative">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                  step === s.id ? "bg-accent-cyan text-white ring-4 ring-accent-cyan/20" :
                  step > s.id ? "bg-success-green text-primary-navy" :
                  "bg-gray-200 text-text-muted"
                )}
              >
                {step > s.id ? <Check size={18} /> : s.id}
              </div>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider absolute -bottom-6 whitespace-nowrap",
                step >= s.id ? "text-text-dark" : "text-text-muted"
              )}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-4">
                <motion.div 
                  className="h-full bg-success-green" 
                  initial={{ width: 0 }}
                  animate={{ width: step > s.id ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="pt-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-6"
            >
              <h2 className="text-xl font-bold text-text-dark">Recipient Details</h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Recipient full name</label>
                  <input 
                    type="text" 
                    placeholder="Juan Dela Cruz"
                    value={recipientData.fullName}
                    onChange={(e) => setRecipientData({ ...recipientData, fullName: e.target.value })}
                    onBlur={() => setTouched({ ...touched, fullName: true })}
                    className={cn(
                      "w-full bg-gray-50 border rounded-lg px-4 py-3 outline-none transition-colors font-medium",
                      errors.fullName ? "border-red-500 focus:border-red-500" : "border-border-base focus:border-accent-cyan"
                    )}
                  />
                  {errors.fullName && <p className="text-xs text-red-500 font-medium mt-1">{errors.fullName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Destination country</label>
                    <div className="relative">
                      <div className="w-full bg-gray-100 border border-border-base rounded-lg px-4 py-3 font-bold flex items-center gap-2 cursor-default opacity-80">
                        <span>🇵🇭</span> Philippines
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Recipient bank</label>
                    <div className="relative">
                      <select 
                        value={recipientData.bank}
                        onChange={(e) => setRecipientData({ ...recipientData, bank: e.target.value })}
                        onBlur={() => setTouched({ ...touched, bank: true })}
                        className={cn(
                          "w-full bg-gray-50 border rounded-lg px-4 py-3 outline-none transition-colors font-medium appearance-none",
                          errors.bank ? "border-red-500 focus:border-red-500" : "border-border-base focus:border-accent-cyan"
                        )}
                      >
                        <option value="">Select a bank</option>
                        {BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                    {errors.bank && <p className="text-xs text-red-500 font-medium mt-1">{errors.bank}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account number</label>
                  <input 
                    type="text" 
                    placeholder="0000 0000 0000"
                    value={recipientData.accountNumber}
                    onChange={(e) => setRecipientData({ ...recipientData, accountNumber: e.target.value })}
                    onBlur={() => setTouched({ ...touched, accountNumber: true })}
                    className={cn(
                      "w-full bg-gray-50 border rounded-lg px-4 py-3 outline-none transition-colors font-medium",
                      errors.accountNumber ? "border-red-500 focus:border-red-500" : "border-border-base focus:border-accent-cyan"
                    )}
                  />
                  {errors.accountNumber ? (
                    <p className="text-xs text-red-500 font-medium mt-1">{errors.accountNumber}</p>
                  ) : (
                    <p className="text-[10px] text-text-muted font-medium">Format: 0000 0000 0000</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Recipient mobile number (optional)</label>
                  <div className="flex gap-2">
                    <div className="bg-gray-100 border border-border-base rounded-lg px-4 py-3 font-bold text-sm flex items-center shrink-0">+63</div>
                    <input 
                      type="text" 
                      placeholder="9XX XXX XXXX"
                      value={recipientData.mobile}
                      onChange={(e) => setRecipientData({ ...recipientData, mobile: e.target.value })}
                      className="w-full bg-gray-50 border border-border-base rounded-lg px-4 py-3 outline-none focus:border-accent-cyan transition-colors font-medium"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-border-base text-accent-cyan focus:ring-accent-cyan" />
                  <span className="text-sm font-medium text-text-dark group-hover:text-accent-cyan transition-colors">Save this recipient for future payouts</span>
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button className="text-text-muted font-bold text-sm hover:text-text-dark transition-colors">Cancel</button>
                <button onClick={handleProceedToStep2} className="btn-primary min-w-[140px]">Continue</button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-8 space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">You send (MYR)</label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-text-dark group-focus-within:text-accent-cyan transition-colors">RM</div>
                    <input 
                      type="text" 
                      value={getFormattedAmount()}
                      onChange={handleAmountChange}
                      onBlur={handleAmountBlur}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border-2 border-border-base rounded-xl pl-16 pr-8 py-8 text-4xl font-black outline-none focus:border-accent-cyan transition-all tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-text-muted font-medium text-right">Min: RM 100 • Max: RM 100,000</p>
                </div>

                <div className="p-6 bg-green-50/50 border border-success-green/20 rounded-xl space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-success-green uppercase tracking-wider">Recipient receives</div>
                      <div className="text-4xl font-black text-text-dark tabular-nums leading-none">
                        {formatCurrency(recipientReceives, 'PHP')}
                      </div>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-success-green/20 text-xs font-bold text-success-green">
                      1 MYR = {EXCHANGE_RATE} PHP
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-success-green/10">
                    <button 
                      onClick={() => setShowFees(!showFees)}
                      className="w-full flex justify-between items-center text-xs font-bold text-success-green uppercase tracking-wider group"
                      aria-expanded={showFees}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info size={14} /> Fee breakdown
                      </span>
                      <ChevronDown size={14} className={cn("transition-transform text-success-green/60", showFees && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {showFees && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-3 pt-2"
                        >
                          <div className="flex justify-between text-xs font-medium text-text-muted uppercase">
                            <span>FX spread (1.20%)</span>
                            <span className="text-text-dark tabular-nums">{formatCurrency(fxSpread, 'MYR')}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-text-muted uppercase">
                            <span>Platform fee (0.20%)</span>
                            <span className="text-text-dark tabular-nums">{formatCurrency(platformFee, 'MYR')}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-text-muted uppercase">
                            <span>Fixed fee</span>
                            <span className="text-text-dark tabular-nums">{formatCurrency(fixedFee, 'MYR')}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="flex justify-between mt-2 pt-2 text-sm font-black text-text-dark border-t border-success-green/10 uppercase">
                      <span>Total you'll pay</span>
                      <span className="tabular-nums text-accent-cyan">
                        {formatCurrency(totalPay, 'MYR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Reference (optional)</label>
                    <input 
                      type="text" 
                      placeholder="INV-2024-001"
                      className="w-full bg-gray-50 border border-border-base rounded-lg px-4 py-3 outline-none focus:border-accent-cyan transition-colors font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Note for recipient</label>
                    <input 
                      type="text" 
                      placeholder="Max 100 characters"
                      className="w-full bg-gray-50 border border-border-base rounded-lg px-4 py-3 outline-none focus:border-accent-cyan transition-colors font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={handleBack} className="flex items-center gap-2 text-text-muted font-bold text-sm hover:text-text-dark transition-colors">
                  <ArrowLeft size={16} /> Back
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={!amount || Number(amount) < 100}
                  className={cn(
                    "btn-primary min-w-[140px]",
                    (!amount || Number(amount) < 100) && "opacity-50 cursor-not-allowed bg-gray-300"
                  )}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2.5 py-2.5 px-3.5 bg-brand-3 border border-brand/30 rounded-[10px] text-[12.5px] text-brand-2 relative" style={{ backgroundImage: `linear-gradient(to right, transparent, transparent)` }}>
                <div 
                  className="w-[18px] h-[18px] rounded-full grid place-items-center relative"
                  style={{ background: `conic-gradient(var(--color-brand) ${((countdown / 30) * 100)}%, color-mix(in oklch, var(--color-brand) 18%, transparent) 0)` }}
                >
                  <div className="absolute inset-[3px] bg-brand-3 rounded-full" />
                </div>
                {countdown <= 0 ? (
                  <>Quote expired — <button className="btn-ghost !h-auto !py-0 !px-0 bg-transparent" onClick={() => setCountdown(30)}>refresh</button></>
                ) : (
                  <>FX rate locked · expires in <strong className="font-mono">{String(countdown).padStart(2, "0")}s</strong></>
                )}
                <div className="flex-1" />
                <span className="text-brand opacity-80 font-mono text-[11px]">Pyth + Switchboard</span>
              </div>

              <div className="card p-8 space-y-8 relative overflow-hidden">
                <h2 className="text-xl font-bold text-text-dark">Review & Confirm</h2>
                
                <div className="space-y-6 relative z-10">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="text-text-muted font-medium">Recipient</div>
                    <div className="text-text-dark font-bold text-right flex items-center justify-end gap-2">
                       Juan Dela Cruz 🇵🇭
                    </div>
                    
                    <div className="text-text-muted font-medium">Recipient Bank</div>
                    <div className="text-text-dark font-bold text-right">BDO Unibank • 0045 2219 8847</div>
                    
                    <div className="col-span-2 h-px bg-border-base my-2" />
                    
                    <div className="text-text-muted font-medium">Amount</div>
                    <div className="text-text-dark font-bold text-right tabular-nums">{formatCurrency(parsedAmount, 'MYR')}</div>
                    
                    <div className="text-text-muted font-medium">Fees</div>
                    <div className="text-text-dark font-bold text-right tabular-nums">{formatCurrency(totalFees, 'MYR')}</div>
                    
                    <div className="text-text-muted font-medium text-lg">Total you'll pay</div>
                    <div className="text-accent-cyan font-black text-xl text-right tabular-nums">{formatCurrency(totalPay, 'MYR')}</div>
                    
                    <div className="col-span-2 h-px bg-border-base my-2" />
                    
                    <div className="text-text-muted font-medium">Recipient receives</div>
                    <div className="text-success-green font-black text-xl text-right tabular-nums">{formatCurrency(recipientReceives, 'PHP')}</div>
                    
                    <div className="text-text-muted font-medium">Exchange rate</div>
                    <div className="text-text-dark font-bold text-right tabular-nums">1 MYR = {EXCHANGE_RATE} PHP</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-border-base rounded-lg mt-4">
                <button 
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-2"><Info size={14} /> How it works</span>
                  <ChevronDown size={14} className={cn("transition-transform", showHowItWorks && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {showHowItWorks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 text-xs text-text-muted leading-relaxed">
                        Your MYR → USDC → Sui blockchain → PHP → Recipient's bank. Fully tracked, fully atomic.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <button onClick={() => setShowConfirmDialog(true)} className="btn-primary w-full text-lg py-5 shadow-xl shadow-success-green/20 group">
                  Confirm & pay via FPX
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  By confirming, you agree to Splash <span className="text-accent-cyan cursor-pointer hover:underline">Terms of Service</span>
                </div>
                <button onClick={handleBack} className="text-text-muted font-bold text-sm hover:text-text-dark transition-colors self-center">
                  Back to edit
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="card p-8 space-y-10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col gap-8">
                  {timelineStages.map((s, idx, arr) => (
                    <div key={idx} className="flex gap-6 relative">
                      {idx < arr.length - 1 && (
                        <div className={cn(
                          "absolute left-4 top-10 w-0.5 h-14 bg-gray-100 transition-all",
                          s.done && "bg-success-green"
                        )} />
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm transition-all duration-500",
                        s.done ? "bg-success-green text-primary-navy scale-110" :
                        s.active ? "bg-white border-2 border-accent-cyan text-accent-cyan animate-pulse ring-4 ring-accent-cyan/10" :
                        "bg-white border-2 border-gray-100 text-gray-300"
                      )}>
                        {s.done ? <Check size={16} strokeWidth={3} /> : (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className={cn(
                            "text-sm font-bold transition-colors",
                            s.active ? "text-accent-cyan" : s.future ? "text-text-muted" : "text-text-dark"
                          )}>
                            {s.title}
                          </h3>
                        </div>
                        <p className={cn(
                          "text-xs font-medium mt-1 mb-2 leading-relaxed transition-colors",
                          s.mono ? "font-mono opacity-60" : "text-text-muted",
                          s.active && !s.mono && "text-text-dark"
                        )}>
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 bg-accent-cyan/5 border-accent-cyan/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent-cyan rounded-full flex items-center justify-center text-white">
                    {stage === 5 ? <PartyPopper size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-accent-cyan uppercase tracking-widest leading-none mb-1">
                      {stage === 5 ? 'Status' : 'Estimated Time'}
                    </div>
                    <div className="text-lg font-black text-primary-navy tabular-nums">
                      {stage === 5 ? 'Completed' : '~ 2 minutes left'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="btn-secondary py-2 text-xs">
                    <ExternalLink size={14} /> View Receipt
                  </button>
                  <button 
                    onClick={() => { setStep(1); setAmount(''); setCountdown(30); }}
                    className="btn-primary py-2 text-xs"
                  >
                    Send Another
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                Are you sure you want to send {formatCurrency(parsedAmount, 'MYR')} to {recipientData.fullName || 'Juan Dela Cruz'}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex-row gap-3 justify-end">
              <button 
                className="btn-secondary px-4 py-2 text-sm" 
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleNext();
                }}
              >
                Confirm
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
