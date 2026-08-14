const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'API call failed');
  }

  return data;
};
