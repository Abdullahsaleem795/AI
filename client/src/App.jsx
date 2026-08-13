import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { SalesPOS } from './pages/SalesPOS';
import { Payments } from './pages/Payments';
import { Reconciliation } from './pages/Reconciliation';
import { Collections } from './pages/Collections';
import { AuditLogs } from './pages/AuditLogs';
import { Login } from './pages/Login';

const AuthenticatedApp = () => {
  const { user, loading } = useAuth();
  const [isAiOpen, setIsAiOpen] = useState(false);

  if (loading) {
    return <div style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading Shop Environment...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar onOpenAi={() => setIsAiOpen(true)} />
        <div className="main-content">
          <Navbar />
          <main className="page-body">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/sales" element={<SalesPOS />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <AiAssistantDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      </div>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
