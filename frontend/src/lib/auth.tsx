import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import api from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null | false;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { email: string; password: string; name: string; company?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | false>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post<User & { token?: string }>("/auth/login", { email, password });
    if (data.token) localStorage.setItem("splash_token", data.token);
    setUser(data);
    return data;
  };

  const register = async (payload: { email: string; password: string; name: string; company?: string }): Promise<User> => {
    const { data } = await api.post<User & { token?: string }>("/auth/register", payload);
    if (data.token) localStorage.setItem("splash_token", data.token);
    setUser(data);
    return data;
  };

  const logout = async (): Promise<void> => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.removeItem("splash_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
