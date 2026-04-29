import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SendPayout from "./pages/SendPayout";
import Transfers from "./pages/Transfers";
import Recipients from "./pages/Recipients";
import Batch from "./pages/Batch";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
        <div className="spinner-ring" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Layout>{children}</Layout>;
}

// Shows landing if not logged in, redirects to /dashboard if logged in
function LandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner-ring" />
    </div>
  );
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

// Shows login if not logged in, redirects to /dashboard if logged in
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page — public, auto-redirects to /dashboard if logged in */}
            <Route path="/" element={<LandingRoute />} />
            {/* Auth */}
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            {/* Protected app */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/send" element={<ProtectedRoute><SendPayout /></ProtectedRoute>} />
            <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
            <Route path="/recipients" element={<ProtectedRoute><Recipients /></ProtectedRoute>} />
            <Route path="/batch" element={<ProtectedRoute><Batch /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;


