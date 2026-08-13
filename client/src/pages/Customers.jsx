import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Search, UserPlus, Phone, QrCode, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    openingBalance: '0',
    creditLimit: '100000'
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch(`/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', address: '', openingBalance: '0', creditLimit: '100000' });
      fetchCustomers();
    } catch (err) {
      alert(`Error creating customer: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Customer Khata Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search and manage shop accounts & balances</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <UserPlus size={18} />
          + Add New Customer
        </button>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} color="var(--text-secondary)" />
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, border: 'none', background: 'transparent' }}
            placeholder="Search by customer name, mobile phone number, or customer code (e.g. CUST-0001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Current Balance (PKR)</th>
                <th>Credit Limit</th>
                <th>QR ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <span className="badge badge-blue">{c.customerCode}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>{c.phone}</td>
                  <td style={{ fontWeight: 800, color: parseFloat(c.currentBalancePKR) > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                    Rs. {c.currentBalancePKR}
                  </td>
                  <td>Rs. {c.creditLimitPKR}</td>
                  <td>
                    <span className="badge badge-emerald">{c.qrIdentifier}</span>
                  </td>
                  <td>
                    <Link to={`/customers/${c._id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      Open Khata
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No customer accounts found. Click "+ Add New Customer" to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Khata Customer</h2>
            <form onSubmit={handleCreateCustomer}>
              <div className="input-group">
                <label className="input-label">Customer Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Ahmed Khan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Mobile Phone Number * (Pakistani Format)</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="03001234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Market / Shop address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Opening Credit Balance (PKR) (Amount Owed currently)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.00"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Account
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
