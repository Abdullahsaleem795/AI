import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { ShoppingCart, CreditCard, RefreshCw, AlertTriangle, Users, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await apiFetch('/reports/dashboard');
      setKpis(res.data.kpis);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading shop metrics...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Shop Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Digital Khata & Automatic Raast Payment Summary</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/sales" className="btn btn-primary">
            <PlusCircle size={18} />
            + New Sale
          </Link>
          <Link to="/payments" className="btn btn-secondary">
            <CreditCard size={18} />
            Receive Payment
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Today's Total Sales</span>
          <div className="kpi-value">Rs. {kpis?.todaySalesPKR || '0.00'}</div>
          <span className="kpi-subtext">Credit: Rs. {kpis?.todayCreditSalesPKR || '0.00'}</span>
        </div>

        <div className="kpi-card blue">
          <span className="kpi-label">Cash Collected Today</span>
          <div className="kpi-value">Rs. {kpis?.cashCollectedPKR || '0.00'}</div>
          <span className="kpi-subtext">Manual Counter Receipts</span>
        </div>

        <div className="kpi-card purple">
          <span className="kpi-label">Digital Raast Collected</span>
          <div className="kpi-value">Rs. {kpis?.digitalCollectedPKR || '0.00'}</div>
          <span className="kpi-subtext">Auto-Reconciled Payments</span>
        </div>

        <div className="kpi-card amber">
          <span className="kpi-label">Total Outstanding Debt</span>
          <div className="kpi-value">Rs. {kpis?.totalOutstandingPKR || '0.00'}</div>
          <span className="kpi-subtext">Across {kpis?.totalCustomersCount || 0} active khata accounts</span>
        </div>

        <div className="kpi-card rose">
          <span className="kpi-label">Unresolved Payments</span>
          <div className="kpi-value">{kpis?.unresolvedReconciliationAlerts || 0}</div>
          <span className="kpi-subtext">Requires Shopkeeper Review</span>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 className="card-title">
            <RefreshCw size={20} color="var(--accent-amber)" />
            Reconciliation Queue Alerts
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem 0' }}>
            Incoming digital payments that could not be matched automatically with 100% confidence.
          </p>
          <Link to="/reconciliation" className="btn btn-secondary" style={{ width: '100%' }}>
            View Unmatched Queue ({kpis?.unresolvedReconciliationAlerts || 0})
          </Link>
        </div>

        <div className="card">
          <h3 className="card-title">
            <AlertTriangle size={20} color="var(--accent-rose)" />
            Active Collection Management
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem 0' }}>
            Identify top debtors, view debt aging (0-90+ days), and dispatch WhatsApp reminders.
          </p>
          <Link to="/collections" className="btn btn-secondary" style={{ width: '100%' }}>
            Manage Collections
          </Link>
        </div>
      </div>
    </div>
  );
};
