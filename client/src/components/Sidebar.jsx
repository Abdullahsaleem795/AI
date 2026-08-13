import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, CreditCard, RefreshCw, AlertTriangle, FileText, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ onOpenAi }) => {
  const { tenant } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Customers / Khata', path: '/customers', icon: Users },
    { label: 'New Sale / POS', path: '/sales', icon: ShoppingCart },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reconciliation', path: '/reconciliation', icon: RefreshCw },
    { label: 'Collections & Aging', path: '/collections', icon: AlertTriangle },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText }
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
          KH
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tenant?.name || 'Pak Retail Khata'}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Raast Digital SaaS</span>
        </div>
      </div>

      <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', border: 'none' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '1rem' }}>
        <button
          onClick={onOpenAi}
          className="btn btn-ai"
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Bot size={20} />
          <span>AI Assistant (Urdu/Voice)</span>
        </button>
      </div>
    </aside>
  );
};
