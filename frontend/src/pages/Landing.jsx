import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, FileText, BarChart2, Upload, ChevronDown, ArrowRight, Check, X, Menu, Globe } from "lucide-react";

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 w-full" style={{ backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--splash-border)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/splash-logo.svg" alt="Splash" className="h-9 w-9 rounded-lg" style={{ backgroundColor: "#000" }} />
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--splash-navy)" }}>Splash</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[["How it works", "#how-it-works"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-medium transition-opacity hover:opacity-60" style={{ color: "var(--splash-text)" }}>{label}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium transition-opacity hover:opacity-60" style={{ color: "var(--splash-navy)" }}>Sign in</Link>
          <Link to="/login" className="text-sm font-semibold text-white rounded-lg px-4 py-2 transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--splash-navy)" }}>Get Started</Link>
        </div>
        <button className="md:hidden p-2 rounded-lg" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu" style={{ color: "var(--splash-navy)" }}>
          <Menu size={22} />
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 flex flex-col gap-3" style={{ borderTop: "1px solid var(--splash-border)", backgroundColor: "#fff" }}>
          {[["How it works", "#how-it-works"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={label} href={href} className="text-sm font-medium py-1" style={{ color: "var(--splash-text)" }} onClick={() => setMobileOpen(false)}>{label}</a>
          ))}
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid var(--splash-border)" }}>
            <Link to="/login" className="text-sm font-medium text-center py-2 rounded-lg" style={{ color: "var(--splash-navy)", border: "1px solid var(--splash-border)" }}>Sign in</Link>
            <Link to="/login" className="text-sm font-semibold text-white text-center py-2 rounded-lg" style={{ backgroundColor: "var(--splash-navy)" }}>Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const [rate, setRate] = useState(12.9822);
  const [rateLoading, setRateLoading] = useState(true);
  const SEND = 1000;
  const FEE = parseFloat((SEND * 0.015).toFixed(2));
  const NET = SEND - FEE;
  const RECEIVE = parseFloat((NET * rate).toFixed(2));

  useEffect(() => {
    const base = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
    fetch(`${base}/api/fx-rate`)
      .then(r => r.json())
      .then(d => { if (d && d.rate) setRate(parseFloat(d.rate)); })
      .catch(() => {})
      .finally(() => setRateLoading(false));
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--splash-navy)" }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(34,167,240,0.18) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,210,160,0.12) 0%, transparent 70%)", transform: "translate(-30%,30%)" }} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-6" style={{ backgroundColor: "rgba(34,167,240,0.15)", color: "var(--splash-cyan)", border: "1px solid rgba(34,167,240,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--splash-green)" }} />
            Now live for Malaysian SMEs
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight text-white mb-5">
            Send money to the Philippines.{" "}
            <span style={{ color: "var(--splash-cyan)" }}>Fast, simple, affordable.</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.72)" }}>
            One flat <strong className="text-white">1.5% all-in fee</strong>. No hidden charges. Transfers settle in under 5 minutes directly to your recipient's Philippine bank account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--splash-green)" }}>
              Get Started <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
              See how it works
            </a>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: "#fff", border: "1px solid var(--splash-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--splash-muted)" }}>Transfer preview</span>
              <span className="text-xs font-medium rounded-full px-2.5 py-0.5" style={{ backgroundColor: "rgba(0,210,160,0.12)", color: "var(--splash-green)" }}>Live rate</span>
            </div>
            <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: "var(--splash-bg)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--splash-muted)" }}>You send</div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--splash-text)" }}>1,000.00</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5" style={{ backgroundColor: "var(--splash-navy)", color: "#fff" }}>MYR</span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-1 mb-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--splash-border)" }} />
              <div className="text-xs tabular-nums" style={{ color: "var(--splash-muted)" }}>
                {rateLoading ? "Loading rate…" : `1 MYR = ${rate.toFixed(4)} PHP`}
              </div>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--splash-border)" }} />
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "rgba(0,210,160,0.07)", border: "1px solid rgba(0,210,160,0.2)" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--splash-muted)" }}>Recipient gets</div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--splash-green)" }}>
                  {RECEIVE.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5" style={{ backgroundColor: "rgba(0,210,160,0.15)", color: "#00a07a" }}>PHP</span>
              </div>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between">
                <span style={{ color: "var(--splash-muted)" }}>Transfer fee (1.5%)</span>
                <span className="font-medium tabular-nums" style={{ color: "var(--splash-text)" }}>RM {FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--splash-muted)" }}>Estimated arrival</span>
                <span className="font-medium" style={{ color: "var(--splash-green)" }}>&lt; 5 minutes</span>
              </div>
            </div>
            <Link to="/login" className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--splash-navy)" }}>
              Send now <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────
function TrustBar() {
  const stats = [
    { value: "1.5%", label: "All-in fee, no surprises" },
    { value: "< 5 min", label: "Settlement time" },
    { value: "10+", label: "Philippine banks" },
    { value: "Sui", label: "Blockchain-secured records" },
  ];
  return (
    <section className="py-10" style={{ backgroundColor: "#fff", borderBottom: "1px solid var(--splash-border)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center px-4 py-2">
              <span className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: "var(--splash-navy)" }}>{s.value}</span>
              <span className="text-sm mt-1" style={{ color: "var(--splash-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { number: "01", title: "Add a recipient", description: "Enter your Philippine recipient's name, bank, and account number. Save them for future transfers.", color: "var(--splash-cyan)" },
    { number: "02", title: "Enter amount & review rate", description: "Type the MYR amount. See the live PHP rate, exact fee, and what your recipient gets — before you confirm.", color: "var(--splash-green)" },
    { number: "03", title: "Done — money arrives", description: "Pay via FPX. Splash settles to your recipient's account in under 5 minutes. A PDF receipt is emailed instantly.", color: "var(--splash-amber)" },
  ];
  return (
    <section id="how-it-works" className="py-20" style={{ backgroundColor: "var(--splash-bg)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: "var(--splash-navy)" }}>How it works</h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--splash-muted)" }}>Three steps from login to your recipient's account. No paperwork, no branch visits.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl p-7 bg-white" style={{ border: "1px solid var(--splash-border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold mb-5" style={{ backgroundColor: step.color + "22", color: step.color }}>{step.number}</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--splash-navy)" }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--splash-muted)" }}>{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--splash-navy)" }}>
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing table ────────────────────────────────────────────────────────────
function PricingTable() {
  const rows = [
    { feature: "Transfer fee", splash: "1.5% flat, all-in", banks: "3–5% + hidden charges", others: "2–4% + markup" },
    { feature: "Exchange rate", splash: "Mid-market rate", banks: "Marked up 2–3%", others: "Marked up 1–2%" },
    { feature: "Settlement speed", splash: "< 5 minutes", banks: "1–3 business days", others: "Hours to 1 day" },
    { feature: "Fee transparency", splash: "Full breakdown upfront", banks: "Often unclear", others: "Partial" },
    { feature: "Batch payouts", splash: true, banks: false, others: false },
    { feature: "PDF receipts", splash: true, banks: false, others: true },
  ];
  const BoolCell = ({ val }) => val
    ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: "rgba(0,210,160,0.15)", color: "var(--splash-green)" }}><Check size={13} strokeWidth={3} /></span>
    : <span className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: "rgba(229,62,62,0.1)", color: "#E53E3E" }}><X size={13} strokeWidth={3} /></span>;
  return (
    <section id="pricing" className="py-20" style={{ backgroundColor: "#fff" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: "var(--splash-navy)" }}>Simple, honest pricing</h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--splash-muted)" }}>One flat fee, no surprises. See how we compare.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--splash-border)" }}>
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--splash-border)" }}>
                <th className="px-4 py-4 text-left text-sm font-medium" style={{ color: "var(--splash-muted)", width: "28%" }}>Feature</th>
                <th className="px-4 py-4 text-center text-sm font-semibold" style={{ color: "#fff", backgroundColor: "var(--splash-navy)", width: "24%" }}>
                  <div className="flex flex-col items-center gap-1">
                    <span>Splash</span>
                    <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: "var(--splash-cyan)", color: "#fff" }}>Recommended</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium" style={{ color: "var(--splash-muted)", width: "24%" }}>Traditional Banks</th>
                <th className="px-4 py-4 text-center text-sm font-medium" style={{ color: "var(--splash-muted)", width: "24%" }}>Other Services</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--splash-border)" : "none" }}>
                  <td className="px-4 py-4 text-sm font-medium" style={{ color: "var(--splash-text)" }}>{row.feature}</td>
                  <td className="px-4 py-4 text-sm text-center font-semibold" style={{ backgroundColor: "rgba(10,30,63,0.04)", color: "var(--splash-navy)" }}>
                    {typeof row.splash === "boolean" ? <BoolCell val={row.splash} /> : row.splash}
                  </td>
                  <td className="px-4 py-4 text-sm text-center" style={{ color: "var(--splash-muted)" }}>
                    {typeof row.banks === "boolean" ? <BoolCell val={row.banks} /> : row.banks}
                  </td>
                  <td className="px-4 py-4 text-sm text-center" style={{ color: "var(--splash-muted)" }}>
                    {typeof row.others === "boolean" ? <BoolCell val={row.others} /> : row.others}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: "var(--splash-muted)" }}>Comparison based on publicly available information. Rates may vary.</p>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: <Zap size={22} />, title: "Live exchange rates", description: "Rates refresh every 10 minutes from the mid-market feed. What you see is what your recipient gets.", color: "var(--splash-cyan)" },
    { icon: <Upload size={22} />, title: "Batch payouts via CSV", description: "Upload a CSV to pay dozens of Philippine recipients in one go. Perfect for payroll and supplier runs.", color: "var(--splash-amber)" },
    { icon: <FileText size={22} />, title: "Instant PDF receipts", description: "Every transfer generates a branded PDF receipt emailed to you automatically. Audit-ready from day one.", color: "var(--splash-green)" },
    { icon: <BarChart2 size={22} />, title: "Real-time tracking", description: "Watch your transfer move from initiated to settled. Powered by Sui blockchain technology for tamper-proof records.", color: "var(--splash-navy)" },
  ];
  return (
    <section className="py-20" style={{ backgroundColor: "var(--splash-bg)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: "var(--splash-navy)" }}>Built for Malaysian businesses</h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--splash-muted)" }}>Everything you need to manage cross-border payouts — without the complexity.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl p-6 bg-white flex flex-col gap-4" style={{ border: "1px solid var(--splash-border)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: f.color + "22", color: f.color }}>{f.icon}</div>
              <div>
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--splash-navy)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--splash-muted)" }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "How long does a transfer take?", a: "Under 5 minutes in most cases. Once your FPX payment is confirmed, Splash routes the funds to your recipient's Philippine bank account almost instantly." },
  { q: "What is the fee?", a: "A flat 1.5% of the transfer amount — that's it. No hidden charges, no exchange rate markup, no monthly fees. The fee is shown clearly before you confirm." },
  { q: "Which Philippine banks are supported?", a: "We support 10+ banks and e-wallets including BDO, BPI, GCash, Metrobank, UnionBank, Landbank, PNB, Security Bank, Chinabank, and more." },
  { q: "Is my money safe?", a: "Yes. Splash operates under Bank Negara Malaysia guidelines and works with a BSP-licensed Philippine partner. Every settlement is recorded on the Sui blockchain for an immutable audit trail." },
  { q: "Can I send to multiple recipients at once?", a: "Absolutely. Use the Batch Payout feature to upload a CSV file with multiple recipients and amounts. Ideal for payroll runs or paying multiple suppliers in one go." },
  { q: "What currencies are supported?", a: "Currently MYR to PHP. We are working on additional corridors — more currency pairs are coming soon." },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--splash-border)", backgroundColor: "#fff" }}>
      <button className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className="text-sm font-semibold" style={{ color: "var(--splash-navy)" }}>{item.q}</span>
        <span className="shrink-0 transition-transform duration-200" style={{ color: "var(--splash-cyan)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronDown size={18} />
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--splash-muted)", borderTop: "1px solid var(--splash-border)" }}>
          <div className="pt-3">{item.a}</div>
        </div>
      )}
    </div>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-20" style={{ backgroundColor: "#fff" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: "var(--splash-navy)" }}>Frequently asked questions</h2>
          <p className="text-base" style={{ color: "var(--splash-muted)" }}>Everything you need to know before your first transfer.</p>
        </div>
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => <FAQItem key={item.q} item={item} />)}
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--splash-muted)" }}>Still have questions?</p>
          <a href="mailto:support@splashpay.io" className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: "var(--splash-cyan)" }}>
            Contact support <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="py-20 relative overflow-hidden" style={{ backgroundColor: "var(--splash-navy)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(34,167,240,0.15) 0%, transparent 60%)" }} />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">Ready to send your first transfer?</h2>
        <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.7)" }}>
          Join Malaysian SMEs already using Splash to pay Philippine recipients faster and cheaper than any bank.
        </p>
        <Link to="/login" className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--splash-green)" }}>
          Get Started <ArrowRight size={16} />
        </Link>
        <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>No credit card required. Set up in minutes.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12" style={{ backgroundColor: "var(--splash-navy)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/splash-logo.svg" alt="Splash" className="h-9 w-9 rounded-lg" style={{ backgroundColor: "#000" }} />
              <span className="text-lg font-semibold text-white">Splash</span>
            </Link>
            <p className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Fast, affordable MYR to PHP transfers for Malaysian businesses.</p>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Globe size={12} />
              Regulated by Bank Negara Malaysia · BSP-licensed PH partner
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[["Privacy Policy", "#"], ["Terms of Service", "#"], ["Contact", "mailto:support@splashpay.io"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</a>
            ))}
          </div>
        </div>
        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
          <span>2026 Splash. All rights reserved.</span>
          <span>Powered by Sui blockchain technology</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <PricingTable />
        <Features />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
