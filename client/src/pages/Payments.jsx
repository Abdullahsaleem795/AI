import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { CreditCard, Plus, ArrowDownLeft } from 'lucide-react';

export const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', amount: '', method: 'CASH', notes: '' });

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await apiFetch('/payments');
      setPayments(res.data.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/customers');
      setCustomers(res.data.customers);
      if (res.data.customers.length > 0) {
        setFormData((prev) => ({ ...prev, customerId: res.data.customers[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ customerId: customers[0]?._id || '', amount: '', method: 'CASH', notes: '' });
      fetchPayments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Payment Transactions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recorded cash and reconciled digital Raast payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          Record Manual Payment
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Amount (PKR)</th>
                <th>Method</th>
                <th>Provider</th>
                <th>Transaction Ref</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{p.customerId?.name || 'Unknown'}</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    Rs. {p.amountPKR}
                  </td>
                  <td>{p.method}</td>
                  <td>{p.provider}</td>
                  <td style={{ fontFamily: 'monospace' }}>{p.providerTransactionId || p.reference || '-'}</td>
                  <td>
                    <span className="badge badge-emerald">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Record Counter Payment</h2>
            <form onSubmit={handleRecordPayment}>
              <div className="input-group">
                <label className="input-label">Customer Account *</label>
                <select
                  className="input-field"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} - Outstanding: Rs. {c.currentBalancePKR}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  placeholder="e.g. 5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Method *</label>
                <select
                  className="input-field"
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="RAAST_QR">Raast QR Scan</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Payment
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
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
