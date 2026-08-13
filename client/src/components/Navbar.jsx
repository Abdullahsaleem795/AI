import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const { user, tenant, logout } = useAuth();

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{tenant?.name}</h2>
        <span className="badge badge-emerald">PKR Currency</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <User size={16} color="var(--accent-emerald)" />
          <span style={{ fontWeight: 600 }}>{user?.name}</span>
          <span className="badge badge-blue">{user?.roles?.[0] || 'OWNER'}</span>
        </div>

        <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
