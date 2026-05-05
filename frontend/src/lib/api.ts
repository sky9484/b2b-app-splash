import axios from "axios";

// In dev, VITE_BACKEND_URL is empty — Vite proxy routes /api → localhost:8001
// In production, set VITE_BACKEND_URL to your backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";
export const API = `${BACKEND_URL}/api`;

// Sui contract IDs (from .env, for building explorer links in the UI)
export const SUI_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID ?? "";
export const SUI_REGISTRY_ID = import.meta.env.VITE_SUI_REGISTRY_ID ?? "";
export const SUI_EXPLORER_BASE = "https://suiscan.xyz/testnet/tx";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("splash_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s — clear stale token so user gets redirected to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("splash_user");
      localStorage.removeItem("splash_token");
      // Only redirect if not already on login/landing
      if (!window.location.pathname.match(/^\/(login)?$/)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export function formatApiError(detail: unknown): string {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  }
  if (
    detail &&
    typeof detail === "object" &&
    "msg" in detail &&
    typeof (detail as Record<string, unknown>).msg === "string"
  ) {
    return (detail as { msg: string }).msg;
  }
  return String(detail);
}

export const formatMYR = (n: number | string | null | undefined): string =>
  `RM ${Number(n ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPHP = (n: number | string | null | undefined): string =>
  `₱ ${Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatNum = (n: number | string | null | undefined, d = 2): string =>
  Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-MY", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

export const initials = (name: string | null | undefined): string =>
  (name ?? "").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = ["#0A1E3F", "#22A7F0", "#00D2A0", "#FFB800", "#7C3AED", "#EC4899", "#10B981", "#F97316"];

export const avatarColor = (name: string | null | undefined): string => {
  const sum = (name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};
