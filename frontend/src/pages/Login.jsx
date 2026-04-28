import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("admin@splash.com");
  const [password, setPassword] = useState("Splash@2026");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register({ email, password, name, company });
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      navigate("/");
    } catch (err) {
      const msg = formatApiError(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ backgroundColor: "var(--splash-bg)" }}>
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ backgroundColor: "var(--splash-navy)" }}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--splash-cyan)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z" />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight">Splash</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
            Pay vendors in the Philippines.<br/>
            <span style={{ color: "var(--splash-cyan)" }}>Settled in 5 minutes.</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Splash lets Malaysian SMEs send PHP payouts straight from FPX. One flat 1.5% fee, real-time tracking, no crypto required.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { v: "1.5%", l: "All-in fee" },
              { v: "<5min", l: "Settlement" },
              { v: "10+", l: "PH banks" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg p-4" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-2xl font-semibold tabular-nums" style={{ color: "var(--splash-green)" }}>{s.v}</div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Regulated by Bank Negara Malaysia · BSP-licensed PH partner
        </div>

        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,167,240,0.18) 0%, transparent 70%)" }} />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--splash-navy)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z" /></svg>
            </div>
            <span className="text-lg font-semibold">Splash</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            {mode === "login" ? "Sign in to your dashboard" : "Create your Splash account"}
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--splash-muted)" }}>
            {mode === "login" ? "Use the demo credentials below to explore." : "We just need a few details to set up your business."}
          </p>

          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <>
                <Field label="Full name">
                  <input data-testid="register-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Aiman Tan" />
                </Field>
                <Field label="Company">
                  <input data-testid="register-company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Acme Sdn Bhd" />
                </Field>
              </>
            )}
            <Field label="Email">
              <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
            </Field>
            <Field label="Password">
              <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            </Field>

            {error && <div className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-100" data-testid="auth-error">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              data-testid="auth-submit"
              className="w-full rounded-lg px-5 py-3 font-medium text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ backgroundColor: "var(--splash-navy)" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : (mode === "login" ? "Sign in" : "Create account")}
              {!submitting && <ArrowRight size={16} />}
            </button>

            <div className="text-sm text-center pt-2" style={{ color: "var(--splash-muted)" }}>
              {mode === "login" ? "New to Splash?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-medium hover:underline"
                style={{ color: "var(--splash-cyan)" }}
                data-testid="toggle-auth-mode"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-8 p-4 rounded-lg text-xs" style={{ backgroundColor: "#EBF5FB", color: "#1F4E79" }}>
            <div className="font-medium mb-1">Demo credentials</div>
            <div className="tabular-nums">admin@splash.com / Splash@2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-0 transition placeholder:text-slate-400";
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5" style={{ color: "var(--splash-text)" }}>{label}</div>
      {children}
    </label>
  );
}
