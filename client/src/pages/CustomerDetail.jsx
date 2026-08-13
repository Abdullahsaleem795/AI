import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { CreditCard, QrCode, Send, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';

export const CustomerDetail = () => {
  const { id } = useParams();
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  useEffect(() => {
    fetchStatement();
  }, [id]);

  const fetchStatement = async () => {
    try {
      const res = await apiFetch(`/customers/${id}/ledger`);
      setStatement(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    try {
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: id,
          amount: paymentAmount,
          method: paymentMethod
        })
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchStatement();
    } catch (err) {
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const handleSendReminder = async () => {
    try {
      const res = await apiFetch('/collections/remind', {
        method: 'POST',
        body: JSON.stringify({ customerId: id, channel: 'WHATSAPP' })
      });
      alert(`WhatsApp Reminder Sent to ${statement.customer.name}!`);
    } catch (err) {
      alert(`Reminder failed: ${err.message}`);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading customer khata...</div>;
  if (!statement) return <div>Customer not found.</div>;

  const { customer, summary, entries } = statement;

  return (
    <div>
      {/* Customer Profile Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{customer.name}</h1>
              <span className="badge badge-emerald">{customer.phone}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Shop Customer Account • Code: {customer.id}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Outstanding Balance
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: parseFloat(customer.currentBalancePKR) > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
              Rs. {customer.currentBalancePKR}
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
            <CreditCard size={18} />
            Receive Payment
          </button>
          <button onClick={handleSendReminder} className="btn btn-amber">
            <Send size={18} />
            Send WhatsApp Reminder
          </button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="kpi-grid">
        <div className="kpi-card rose">
          <span className="kpi-label">Total Credit Sales (Debits)</span>
          <div className="kpi-value">Rs. {summary.totalDebitsPKR}</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Payments Received (Credits)</span>
          <div className="kpi-value">Rs. {summary.totalCreditsPKR}</div>
        </div>
        <div className="kpi-card amber">
          <span className="kpi-label">Closing Khata Balance</span>
          <div className="kpi-value">Rs. {summary.closingBalancePKR}</div>
        </div>
      </div>

      {/* Hisaab Ledger Table */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>
          <FileText size={20} color="var(--accent-emerald)" />
          Digital Hisaab Ledger Statement
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Event Type</th>
                <th>Description</th>
                <th>Debit (Sales +)</th>
                <th>Credit (Payments -)</th>
                <th>Balance After (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${e.direction === 'DEBIT' ? 'badge-rose' : 'badge-emerald'}`}>
                      {e.type}
                    </span>
                  </td>
                  <td>{e.description}</td>
                  <td style={{ color: 'var(--accent-rose)', fontWeight: e.direction === 'DEBIT' ? 700 : 400 }}>
                    {e.direction === 'DEBIT' ? `Rs. ${e.amountPKR}` : '-'}
                  </td>
                  <td style={{ color: 'var(--accent-emerald)', fontWeight: e.direction === 'CREDIT' ? 700 : 400 }}>
                    {e.direction === 'CREDIT' ? `Rs. ${e.amountPKR}` : '-'}
                  </td>
                  <td style={{ fontWeight: 800 }}>Rs. {e.balanceAfterPKR}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No ledger entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Receive Payment from {customer.name}</h2>
            <form onSubmit={handleRecordPayment}>
              <div className="input-group">
                <label className="input-label">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  placeholder="e.g. 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Payment Channel / Method *</label>
                <select
                  className="input-field"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Counter Cash</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="RAAST_QR">Raast QR Code</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm & Post Payment
                </button>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
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
