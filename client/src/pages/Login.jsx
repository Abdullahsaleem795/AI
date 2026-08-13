import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login, registerShop } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    shopName: '',
    ownerName: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await registerShop({
          shopName: formData.shopName,
          ownerName: formData.ownerName,
          phone: formData.phone,
          password: formData.password
        });
      } else {
        await login(formData.phone, formData.password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>
            KH
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{isRegistering ? 'Register Your Shop' : 'Shopkeeper Login'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            AI Collections & Automatic Payment Reconciliation SaaS
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div className="input-group">
                <label className="input-label">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. ABC Hardware Store"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Owner Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Abdullah Saleem"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label className="input-label">Mobile Phone Number *</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="+923001234567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password *</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}>
            {isRegistering ? 'Create Shop Account' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegistering ? 'Already have a shop account?' : "Don't have a shop account yet?"}{' '}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', fontWeight: 700, cursor: 'pointer' }}
          >
            {isRegistering ? 'Login' : 'Register Shop'}
          </button>
        </div>
      </div>
    </div>
  );
};
