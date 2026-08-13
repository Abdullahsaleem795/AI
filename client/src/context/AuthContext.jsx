import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/auth/me');
        setUser(res.data.user);
        setTenant(res.data.tenant);
      } catch (err) {
        console.error('Session restore failed:', err);
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (phone, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    localStorage.setItem('accessToken', res.data.tokens.accessToken);
    setUser(res.data.user);
    setTenant(res.data.tenant);
    return res.data;
  };

  const registerShop = async (data) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    localStorage.setItem('accessToken', res.data.tokens.accessToken);
    setUser(res.data.user);
    setTenant(res.data.tenant);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, registerShop, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
