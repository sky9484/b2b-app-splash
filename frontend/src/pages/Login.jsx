import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";

// Sui zkLogin with Google — opens the Sui zkLogin OAuth flow
// Requires REACT_APP_GOOGLE_CLIENT_ID in frontend/.env
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const ZK_LOGIN_REDIRECT = window.location.origin + "/login";
const ZK_CONFIGURED = Boolean(GOOGLE_CLIENT_ID);

function handleZkLogin() {
  if (!ZK_CONFIGURED) return; // button is disabled when not configured
  const nonce = Math.random().toString(36).substring(2, 18);
  sessionStorage.setItem("zk_nonce", nonce);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: ZK_LOGIN_REDIRECT,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [zkLoading, setZkLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await register({ email, password, name, company });
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      navigate("/dashboard");
    } catch (err) {
      // Network error — backend not reachable
      if (!err.response) {
        const msg = "Cannot reach the server. Make sure the backend is running on port 8001.";
        setError(msg);
        toast.error(msg);
      } else {
        const msg = formatApiError(err.response?.data?.detail) || err.message;
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onZkLogin = () => {
    setZkLoading(true);
    try {
      handleZkLogin();
    } catch {
      setZkLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ backgroundColor: "var(--splash-bg)" }}>
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ backgroundColor: "var(--splash-navy)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/splash-logo.svg" alt="Splash" className="h-12 w-12 rounded-xl object-cover" style={{ backgroundColor: "#000" }} />
          <div>
            <div className="text-xl font-semibold tracking-tight">Splash</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>MY → PH PAYOUTS</div>
          </div>
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
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <img src="/splash-logo.svg" alt="Splash" className="h-10 w-10 rounded-lg object-cover" style={{ backgroundColor: "#000" }} />
            <span className="text-lg font-semibold">Splash</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            {mode === "login" ? "Sign in to your dashboard" : "Create your Splash account"}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--splash-muted)" }}>
            {mode === "login" ? "Enter your credentials to continue." : "Fill in your details to get started."}
          </p>

          {/* zkLogin with Google */}
          <button
            type="button"
            onClick={onZkLogin}
            disabled={zkLoading || !ZK_CONFIGURED}
            title={!ZK_CONFIGURED ? "Add REACT_APP_GOOGLE_CLIENT_ID to frontend/.env to enable" : ""}
            className="w-full flex items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed mb-4"
            style={{ borderColor: "var(--splash-border)", color: "var(--splash-text)" }}
          >
            {zkLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {mode === "login" ? "Sign in with Google (zkLogin)" : "Register with Google (zkLogin)"}
            {!ZK_CONFIGURED && <span className="ml-auto text-xs opacity-50">Not configured</span>}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--splash-border)" }} />
            <span className="text-xs" style={{ color: "var(--splash-muted)" }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--splash-border)" }} />
          </div>

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

            {error && (
              <div className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-100" data-testid="auth-error">
                {error}
              </div>
            )}

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

            <div className="text-sm text-center pt-1" style={{ color: "var(--splash-muted)" }}>
              {mode === "login" ? "New to Splash?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="font-medium hover:underline"
                style={{ color: "var(--splash-cyan)" }}
                data-testid="toggle-auth-mode"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </div>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-3 rounded-lg text-xs" style={{ backgroundColor: "#EBF5FB", color: "#1F4E79" }}>
            <div className="font-medium mb-0.5">Demo credentials</div>
            <div className="tabular-nums opacity-80">admin@splash.com / Splash@2026</div>
          </div>

          {/* zkLogin setup note — only shown when not configured */}
          {!ZK_CONFIGURED && (
            <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: "#F0F9FF", color: "#0369A1", border: "1px solid #BAE6FD" }}>
              <div className="font-semibold mb-1">Enable Google sign-in (zkLogin)</div>
              <ol className="list-decimal list-inside space-y-1 opacity-80">
                <li>Create an OAuth 2.0 Client ID at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">Google Cloud Console</a></li>
                <li>Set redirect URI to <code className="bg-blue-100 px-1 rounded">http://localhost:3000/login</code></li>
                <li>Add to <code className="bg-blue-100 px-1 rounded">frontend/.env</code>:<br/><code className="bg-blue-100 px-1 rounded">REACT_APP_GOOGLE_CLIENT_ID=your-client-id</code></li>
                <li>Restart the frontend</li>
              </ol>
            </div>
          )}
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
