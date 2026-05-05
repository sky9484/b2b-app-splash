/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SendPayout from './pages/SendPayout';
import Transfers from './pages/Transfers';
import Recipients from './pages/Recipients';
import BatchPayouts from './pages/BatchPayouts';
import Settings from './pages/Settings';
import { Toaster } from './components/ui/sonner';

/** Wrap all authenticated app routes inside the sidebar layout */
function AppRoutes() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/send" element={<SendPayout />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/recipients" element={<Recipients />} />
        <Route path="/batch" element={<BatchPayouts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

/** Login page — redirect to dashboard if already logged in */
function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<Landing />} />
          {/* Auth */}
          <Route path="/login" element={<LoginRoute />} />
          {/* Protected app — everything under /dashboard, /send, etc. */}
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
