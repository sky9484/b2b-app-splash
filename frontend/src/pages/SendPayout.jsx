import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { API, formatMYR, formatPHP, formatNum, formatApiError } from "../lib/api";
import { Check, ChevronRight, ChevronLeft, ArrowRight, ChevronDown, Loader2, PartyPopper, ExternalLink, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const BANKS = [
  "BDO Unibank", "BPI (Bank of the Philippine Islands)", "Metrobank",
  "UnionBank of the Philippines", "Land Bank", "PNB (Philippine National Bank)",
  "RCBC", "Security Bank", "GCash (e-wallet)", "PayMaya (e-wallet)",
];

const STEPS = [
  { id: 1, label: "Recipient" }, { id: 2, label: "Amount" }, { id: 3, label: "Review" }, { id: 4, label: "Track" },
];

export default function SendPayout() {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState({ name: "", bank: "", account_number: "", mobile: "", save: true });
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState(null);
  const [showFee, setShowFee] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [creating, setCreating] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Fetch quote on amount change (debounced)
  useEffect(() => {
    if (step !== 2) return;
    const a = parseFloat(amount);
    if (!a || a < 100) { setQuote(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/quote", { send_amount_myr: a });
        setQuote(data);
      } catch (e) {
        setQuote(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [amount, step]);

  // Countdown for review step
  useEffect(() => {
    if (step !== 3 || !quote) return;
    setCountdown(30);
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step, quote]);

  // Refresh quote when countdown expires
  useEffect(() => {
    if (step === 3 && countdown === 0) {
      (async () => {
        try {
          const { data } = await api.post("/quote", { send_amount_myr: parseFloat(amount) });
          setQuote(data);
          setCountdown(30);
        } catch {}
      })();
    }
  }, [countdown, step, amount]);

  // Track step: poll advance
  useEffect(() => {
    if (step !== 4 || !transfer) return;
    if (transfer.status === "completed") return;
    const t = setInterval(async () => {
      try {
        const { data } = await api.post(`/transfers/${transfer.id}/advance`);
        setTransfer(data);
        if (data.status === "completed") clearInterval(t);
      } catch {}
    }, 2200);
    return () => clearInterval(t);
  }, [step, transfer?.id, transfer?.status]); // eslint-disable-line

  const [fpxStage, setFpxStage] = useState(null); // null | "bank-pick" | "authorizing" | "done"
  const [fpxBank, setFpxBank] = useState("Maybank2u");

  // Lazy-load Razorpay checkout script when needed
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const createRecipientAndTransfer = async () => {
    let recId;
    try {
      const { data: rec } = await api.post("/recipients", {
        name: recipient.name, country: "PH", bank: recipient.bank,
        account_number: recipient.account_number, mobile: recipient.mobile,
      });
      recId = rec.id;
    } catch (e) {
      if (e.response?.status === 409) {
        const { data: list } = await api.get("/recipients");
        const match = list.find((r) => r.bank === recipient.bank && r.account_number.replace(/\s/g, "") === recipient.account_number.replace(/\s/g, ""));
        if (!match) throw e;
        recId = match.id;
        toast.info(`Reusing existing recipient: ${match.name}`);
      } else throw e;
    }
    const { data } = await api.post("/transfers", {
      recipient_id: recId, send_amount_myr: parseFloat(amount), reference, note,
    });
    return data;
  };

  const confirm = async () => {
    setCreating(true);
    try {
      // 1. Create the transfer record (status=pending) before kicking off payment
      const tx = await createRecipientAndTransfer();
      setTransfer(tx);

      // 2. Ask backend whether to use real Razorpay/Curlec or mock FPX
      const { data: init } = await api.post(`/transfers/${tx.id}/init-payment`);

      if (init.mocked) {
        // Show mocked Curlec-style modal
        setCreating(false);
        setFpxStage("bank-pick");
        return;
      }

      // 3. Open real Razorpay checkout
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay checkout");
      const rzp = new window.Razorpay({
        key: init.key_id,
        amount: init.amount,
        currency: init.currency,
        order_id: init.order_id,
        name: "Splash",
        description: `Payout to ${recipient.name} (${init.reference})`,
        prefill: { name: init.name, email: init.email },
        theme: { color: "#0A1E3F" },
        method: { netbanking: true, upi: false, card: false, wallet: false },
        handler: async (res) => {
          try {
            await api.post(`/transfers/${tx.id}/verify-payment`, {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            toast.success("FPX payment authorized");
            setStep(4);
          } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || "Payment verification failed");
          } finally {
            setCreating(false);
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled");
            setCreating(false);
          },
        },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message || "Failed to start payment");
      setCreating(false);
    }
  };

  const completeFpxFlow = async () => {
    // Mocked Curlec FPX simulation when real keys are absent
    setFpxStage("authorizing");
    setCreating(true);
    try {
      await new Promise((r) => setTimeout(r, 1600));
      setFpxStage(null);
      setStep(4);
      toast.success("Payment submitted!");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
      setFpxStage(null);
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRecipient({ name: "", bank: "", account_number: "", mobile: "", save: true });
    setAmount(""); setReference(""); setNote(""); setQuote(null); setTransfer(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto" data-testid="send-payout-page">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Send a payout</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>From your bank to theirs in under 5 minutes.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8" data-testid="wizard-stepper">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition"
                  style={{
                    backgroundColor: done ? "var(--success)" : active ? "var(--indigo)" : "#E2E8F0",
                    color: done || active ? "#fff" : "#718096",
                  }}
                  data-testid={`step-${s.id}-indicator`}
                >
                  {done ? <Check size={14} /> : s.id}
                </div>
                <div className="text-xs font-medium hidden sm:block" style={{ color: active ? "var(--ink)" : "var(--ink-3)" }}>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px mx-3" style={{ backgroundColor: done ? "var(--success)" : "var(--outline)" }} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border p-6 md:p-8 animate-fade-up" style={{ borderColor: "var(--outline)" }}>
        {step === 1 && <StepRecipient recipient={recipient} setRecipient={setRecipient} onContinue={() => setStep(2)} />}
        {step === 2 && <StepAmount amount={amount} setAmount={setAmount} quote={quote} showFee={showFee} setShowFee={setShowFee} reference={reference} setReference={setReference} note={note} setNote={setNote} onBack={() => setStep(1)} onContinue={() => setStep(3)} />}
        {step === 3 && <StepReview recipient={recipient} amount={amount} quote={quote} countdown={countdown} confirming={creating} onBack={() => setStep(2)} onConfirm={confirm} />}
        {step === 4 && <StepTrack transfer={transfer} onReset={reset} />}
      </div>

      {fpxStage && (
        <FPXModal
          stage={fpxStage}
          bank={fpxBank}
          setBank={setFpxBank}
          amount={parseFloat(amount || 0)}
          onCancel={() => { setFpxStage(null); setCreating(false); }}
          onAuthorize={completeFpxFlow}
        />
      )}
    </div>
  );
}

function FPXModal({ stage, bank, setBank, amount, onCancel, onAuthorize }) {
  const banks = [
    { id: "Maybank2u", label: "Maybank2u", color: "#FFCB05" },
    { id: "CIMB Clicks", label: "CIMB Clicks", color: "#7B1818" },
    { id: "Public Bank", label: "PBe (Public Bank)", color: "#D62128" },
    { id: "RHB Now", label: "RHB Now", color: "#02559C" },
    { id: "Hong Leong Connect", label: "Hong Leong Connect", color: "#F0762E" },
    { id: "AmOnline", label: "AmOnline", color: "#E2231A" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(30,27,75,0.6)", backdropFilter: "blur(4px)" }} data-testid="fpx-modal">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-fade-up">
        <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--raised)", borderBottom: "1px solid var(--outline)" }}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "var(--success)" }} />
            <span className="text-sm font-semibold tracking-tight">FPX · Secure online banking</span>
          </div>
          <button onClick={onCancel} className="text-xs font-medium" style={{ color: "var(--ink-3)" }} data-testid="fpx-cancel">Cancel</button>
        </div>

        {stage === "bank-pick" && (
          <div className="p-6">
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--ink-3)" }}>Amount to debit</div>
            <div className="text-2xl font-semibold tabular-nums mb-5">RM {amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</div>
            <div className="text-sm font-medium mb-3">Choose your bank</div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {banks.map((b) => (
                <button
                  key={b.id} onClick={() => setBank(b.id)} data-testid={`fpx-bank-${b.id}`}
                  className="text-left rounded-lg border p-3 transition hover:border-[#4338CA]"
                  style={{ borderColor: bank === b.id ? "var(--indigo)" : "var(--outline)", backgroundColor: bank === b.id ? "rgba(67,56,202,0.06)" : "white" }}
                >
                  <div className="w-6 h-6 rounded mb-2" style={{ backgroundColor: b.color }} />
                  <div className="text-xs font-medium leading-tight">{b.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={onAuthorize} data-testid="fpx-authorize"
              className="w-full rounded-lg py-3 font-semibold text-white transition hover:opacity-95"
              style={{ backgroundColor: "var(--sidebar)" }}
            >
              Continue to {bank}
            </button>
            <p className="text-xs text-center mt-3" style={{ color: "var(--ink-3)" }}>Powered by FPX · Cleared by PayNet Malaysia</p>
          </div>
        )}

        {stage === "authorizing" && (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 mb-4"><div className="spinner-ring" style={{ width: 48, height: 48, borderWidth: 4 }} /></div>
            <div className="font-semibold">Authorizing with {bank}…</div>
            <div className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>Securely debiting RM {amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })} from your account.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepRecipient({ recipient, setRecipient, onContinue }) {
  const set = (k) => (e) => setRecipient({ ...recipient, [k]: e.target.value });
  const valid = recipient.name && recipient.bank && recipient.account_number;
  return (
    <div className="space-y-5" data-testid="step-recipient">
      <h2 className="text-lg font-semibold tracking-tight">Recipient details</h2>
      <Field label="Recipient full name">
        <input data-testid="recipient-name" className={inputCls} placeholder="Juan Dela Cruz" value={recipient.name} onChange={set("name")} />
      </Field>
      <Field label="Destination country">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)" }}>
          <span className="text-lg">🇵🇭</span>
          <span className="text-sm">Philippines</span>
        </div>
      </Field>
      <Field label="Recipient bank">
        <Select value={recipient.bank} onValueChange={(v) => setRecipient({ ...recipient, bank: v })}>
          <SelectTrigger data-testid="recipient-bank" className="rounded-lg"><SelectValue placeholder="Select bank or e-wallet" /></SelectTrigger>
          <SelectContent>
            {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Account number" hint="Format: 0000 0000 0000">
        <input data-testid="recipient-account" className={inputCls} placeholder="0000 0000 0000" value={recipient.account_number} onChange={set("account_number")} />
      </Field>
      <Field label="Recipient mobile number (optional)">
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 text-sm font-medium" style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)", color: "var(--ink)" }}>+63</span>
          <input data-testid="recipient-mobile" className={inputCls + " rounded-l-none"} placeholder="9XX XXX XXXX" value={recipient.mobile} onChange={set("mobile")} />
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={recipient.save} onChange={(e) => setRecipient({ ...recipient, save: e.target.checked })} className="rounded" data-testid="save-recipient" />
        <span>Save this recipient for future payouts</span>
      </label>
      <div className="flex justify-between pt-2">
        <button className={btnSecondary} onClick={() => window.history.back()}>Cancel</button>
        <button data-testid="step-recipient-continue" onClick={onContinue} disabled={!valid} className={btnPrimary} style={{ backgroundColor: "var(--success)", opacity: valid ? 1 : 0.5 }}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StepAmount({ amount, setAmount, quote, showFee, setShowFee, reference, setReference, note, setNote, onBack, onContinue }) {
  const valid = parseFloat(amount) >= 100 && parseFloat(amount) <= 150000;
  return (
    <div className="space-y-5" data-testid="step-amount">
      <h2 className="text-lg font-semibold tracking-tight">Amount & quote</h2>

      <div>
        <div className="text-xs font-medium mb-1.5">You send (MYR)</div>
        <div className="flex">
          <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 text-sm font-semibold" style={{ borderColor: "var(--outline)", backgroundColor: "var(--raised)" }}>RM</span>
          <input
            data-testid="send-amount"
            type="number" step="0.01" min="100" max="150000"
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="flex-1 rounded-r-lg border bg-white px-3 py-3 text-2xl font-semibold tabular-nums outline-none focus:ring-2"
            style={{ borderColor: "var(--outline)" }}
          />
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>Min: RM 100 • Max: RM 150,000</div>
      </div>

      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--success-bg)", border: "1px solid var(--success-border)" }}>
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Recipient receives</div>
        <div className="text-3xl font-semibold tabular-nums mt-1" style={{ color: "var(--success)" }} data-testid="receive-amount">
          {quote ? formatPHP(quote.receive_amount_php) : "₱ 0.00"}
        </div>
        <div className="text-xs mt-2 tabular-nums" style={{ color: "var(--ink-3)" }}>
          {quote ? `1 MYR = ${formatNum(quote.rate, 4)} PHP` : "Enter an amount to see live rate"}
        </div>

        {quote && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--success-border)" }}>
            <button className="text-sm font-medium flex items-center gap-1" onClick={() => setShowFee(!showFee)} data-testid="toggle-fee-breakdown" style={{ color: "var(--ink)" }}>
              <ChevronDown size={14} className="transition-transform" style={{ transform: showFee ? "rotate(180deg)" : "none" }} />
              Fee breakdown
            </button>
            {showFee && (
              <div className="mt-3 space-y-1.5 text-sm tabular-nums">
                <Row k="FX spread (1.20%)" v={formatMYR(quote.fx_spread)} />
                <Row k="Platform fee (0.20%)" v={formatMYR(quote.platform_fee)} />
                <Row k="Fixed fee" v={formatMYR(quote.fixed_fee)} />
                <Row k="Total fee" v={formatMYR(quote.total_fee)} bold />
              </div>
            )}
            <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm font-semibold" style={{ borderColor: "var(--success-border)" }}>
              <span>Total you'll pay</span>
              <span className="tabular-nums">{formatMYR(quote.total_debit_myr)}</span>
            </div>
          </div>
        )}
      </div>

      <Field label="Payment reference / Invoice number (optional)">
        <input data-testid="payment-reference" className={inputCls} placeholder="INV-2026-0042" value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Field label="Note for recipient (optional)" hint={`${note.length}/100`}>
        <textarea maxLength={100} data-testid="payment-note" className={inputCls + " min-h-[72px] resize-none"} placeholder="March invoice payment" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className={btnSecondary}><ChevronLeft size={16}/> Back</button>
        <button data-testid="step-amount-continue" onClick={onContinue} disabled={!valid} className={btnPrimary} style={{ backgroundColor: "var(--success)", opacity: valid ? 1 : 0.5 }}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StepReview({ recipient, amount, quote, countdown, confirming, onBack, onConfirm }) {
  const [showHow, setShowHow] = useState(false);
  const expiring = countdown < 10;
  if (!quote) return null;
  return (
    <div className="space-y-5" data-testid="step-review">
      <h2 className="text-lg font-semibold tracking-tight">Review & confirm</h2>

      <div className="rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium tabular-nums"
        style={{ backgroundColor: expiring ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.12)", color: expiring ? "#991B1B" : "#92400E" }}
        data-testid="quote-countdown">
        <Loader2 size={14} className="animate-spin" /> Quote expires in {countdown}s
      </div>

      <div className="rounded-xl border divide-y" style={{ borderColor: "var(--outline)" }}>
        <Row2 k="Recipient" v={`${recipient.name} 🇵🇭`} />
        <Row2 k="Bank" v={`${recipient.bank} • ${recipient.account_number}`} />
        <Row2 k="You send" v={formatMYR(parseFloat(amount))} />
        <Row2 k="Fee" v={formatMYR(quote.total_fee)} muted />
        <Row2 k="Total debit" v={formatMYR(quote.total_debit_myr)} bold />
        <Row2 k="Recipient receives" v={formatPHP(quote.receive_amount_php)} green bold />
        <Row2 k="Exchange rate" v={`1 MYR = ${formatNum(quote.rate, 4)} PHP`} muted />
      </div>

      <div className="rounded-lg border p-4" style={{ borderColor: "var(--outline)" }}>
        <button className="text-sm font-medium flex items-center gap-1" onClick={() => setShowHow(!showHow)} data-testid="how-it-works">
          <ChevronDown size={14} style={{ transform: showHow ? "rotate(180deg)" : "none" }} className="transition-transform" />
          How it works
        </button>
        {showHow && (
          <div className="text-sm mt-2 leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Your MYR is converted to USDC on Luno, settled atomically on the Sui blockchain, and converted to PHP on Coins.ph before reaching your recipient's bank. The whole journey is fully tracked and auditable.
          </div>
        )}
      </div>

      <button data-testid="confirm-payment" onClick={onConfirm} disabled={confirming} className="w-full rounded-lg px-5 py-3.5 font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
        style={{ backgroundColor: "var(--success)" }}>
        {confirming ? <Loader2 size={16} className="animate-spin" /> : <>Confirm & pay via FPX <ArrowRight size={16} /></>}
      </button>
      <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>By confirming, you agree to Splash Terms of Service.</p>

      <div className="flex justify-start">
        <button onClick={onBack} className={btnSecondary}><ChevronLeft size={16}/> Back</button>
      </div>
    </div>
  );
}

function StepTrack({ transfer, onReset }) {
  const allDone = transfer && transfer.status === "completed";
  const dims = useWindowSize();
  if (!transfer) return null;
  return (
    <div className="space-y-5" data-testid="step-track">
      {allDone && <Confetti width={dims.width} height={dims.height} numberOfPieces={250} recycle={false} />}
      <h2 className="text-lg font-semibold tracking-tight">Payment progress</h2>

      {allDone && (
        <div className="rounded-lg p-4 flex items-center gap-3" style={{ backgroundColor: "var(--success-bg)", border: "1px solid var(--success-border)" }} data-testid="payment-complete-banner">
          <PartyPopper size={20} style={{ color: "var(--success)" }} />
          <div>
            <div className="font-semibold" style={{ color: "var(--success)" }}>Payment complete!</div>
            <div className="text-sm" style={{ color: "var(--ink-3)" }}>Funds delivered to {transfer.recipient_name}.</div>
          </div>
        </div>
      )}

      <div className="space-y-0">
        {transfer.stages.map((s, i) => {
          const active = !s.done && (i === 0 || transfer.stages[i - 1].done);
          return (
            <div key={s.key} className="flex gap-4 pb-5 last:pb-0" data-testid={`stage-${s.key}`}>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: s.done ? "var(--success)" : active ? "rgba(67,56,202,0.15)" : "#F1F5F9",
                    border: active ? "2px solid var(--indigo)" : "none",
                  }}>
                  {s.done ? <Check size={14} className="text-white" /> :
                    active ? <div className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> :
                    <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </div>
                {i < transfer.stages.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ backgroundColor: s.done ? "var(--success)" : "var(--outline)" }} />
                )}
              </div>
              <div className="flex-1 pt-1">
                <div className="text-sm font-semibold" style={{ color: s.done || active ? "var(--ink)" : "var(--ink-3)" }}>
                  {s.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                  {s.key === "sui" ? <span className="mono">{s.desc}</span> : s.desc}
                </div>
                <div className="text-xs mt-1 tabular-nums" style={{ color: s.done ? "var(--success)" : "var(--ink-3)" }}>
                  {s.done && s.ts ? `Completed at ${new Date(s.ts).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}` : active ? "ETA: a few seconds" : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-sm pt-2" style={{ color: "var(--ink-3)" }}>
        Estimated total time: <span className="font-medium tabular-nums">~5 minutes</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <a
          href={transfer.sui_explorer_url || "#"}
          target="_blank" rel="noreferrer"
          data-testid="view-sui-explorer"
          className="rounded-lg px-5 py-2.5 font-medium border bg-white inline-flex items-center gap-2 transition hover:bg-slate-50"
        >
          <ExternalLink size={14} /> View on Sui Explorer
        </a>
        <button
          className="rounded-lg px-5 py-2.5 font-medium border bg-white inline-flex items-center gap-2 transition hover:bg-slate-50"
          data-testid="download-receipt"
          onClick={async () => {
            try {
              const token = localStorage.getItem("splash_token");
              const res = await fetch(`${API}/transfers/${transfer.id}/receipt`, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) throw new Error("Failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `splash-receipt-${transfer.reference}.pdf`;
              a.click(); URL.revokeObjectURL(url);
              toast.success("Receipt downloaded");
            } catch {
              toast.error("Could not download receipt");
            }
          }}
        >
          <Download size={14} /> Download receipt
        </button>
        <button onClick={onReset} className={btnPrimary} style={{ backgroundColor: "var(--sidebar)" }} data-testid="send-another">
          Send another payment
        </button>
      </div>
    </div>
  );
}

// Helpers
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

const inputCls = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#22A7F0]/30 transition placeholder:text-slate-400";
const btnPrimary = "rounded-lg px-5 py-2.5 font-medium text-white inline-flex items-center gap-2 transition hover:opacity-95";
const btnSecondary = "rounded-lg px-5 py-2.5 font-medium border bg-white inline-flex items-center gap-2 transition hover:bg-slate-50";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1.5">
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-xs" style={{ color: "var(--ink-3)" }}>{hint}</div>}
      </div>
      {children}
    </label>
  );
}
function Row({ k, v, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "var(--ink-3)" }}>{k}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}
function Row2({ k, v, muted, bold, green }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm" style={{ color: "var(--ink-3)" }}>{k}</span>
      <span className={`text-sm tabular-nums ${bold ? "font-semibold" : ""}`} style={{ color: green ? "var(--success)" : muted ? "var(--ink-3)" : "var(--ink)" }}>{v}</span>
    </div>
  );
}
