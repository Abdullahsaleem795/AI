import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export const Reconciliation = () => {
  const [reconciliations, setReconciliations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [assignCustomerId, setAssignCustomerId] = useState('');

  useEffect(() => {
    fetchReconciliations();
    fetchCustomers();
  }, []);

  const fetchReconciliations = async () => {
    try {
      const res = await apiFetch('/reconciliation/unmatched');
      setReconciliations(res.data.reconciliations);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (recordId, custId) => {
    const targetCustomer = custId || assignCustomerId;
    if (!targetCustomer) {
      alert('Please select a customer account to match this payment.');
      return;
    }

    try {
      await apiFetch(`/reconciliation/${recordId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ customerId: targetCustomer })
      });

      setSelectedRecord(null);
      fetchReconciliations();
    } catch (err) {
      alert(`Resolution error: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Automatic Payment Reconciliation Queue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Match incoming bank and Raast digital payments with customer khata accounts
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tx Reference</th>
                <th>Payment Amount</th>
                <th>Provider / Method</th>
                <th>Matching Confidence</th>
                <th>Signal</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r) => (
                <tr key={r._id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.paymentId?.providerTransactionId || r._id}</span>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    Rs. {r.paymentAmountPKR}
                  </td>
                  <td>{r.paymentId?.provider || 'RAAST'} ({r.paymentId?.method})</td>
                  <td>
                    <span className={`badge ${r.confidenceScore >= 80 ? 'badge-emerald' : r.confidenceScore >= 50 ? 'badge-amber' : 'badge-rose'}`}>
                      {r.confidenceScore}% Score
                    </span>
                  </td>
                  <td>{r.matchSignal}</td>
                  <td>
                    <span className="badge badge-amber">{r.status}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedRecord(r);
                        if (r.matchCandidates && r.matchCandidates.length > 0) {
                          setAssignCustomerId(r.matchCandidates[0].customerId?._id || '');
                        }
                      }}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      Assign & Reconcile
                    </button>
                  </td>
                </tr>
              ))}
              {reconciliations.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <div>All digital payments are fully reconciled! No pending alerts in review queue.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Resolution Modal */}
      {selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Match Incoming Payment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Amount: <strong style={{ color: 'var(--accent-emerald)' }}>Rs. {selectedRecord.paymentAmountPKR}</strong> | Ref: {selectedRecord.paymentId?.providerTransactionId}
            </p>

            <div className="input-group">
              <label className="input-label">Select Customer Khata Account *</label>
              <select
                className="input-field"
                value={assignCustomerId}
                onChange={(e) => setAssignCustomerId(e.target.value)}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.customerCode}) - Current Debt: Rs. {c.currentBalancePKR}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => handleResolve(selectedRecord._id)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Confirm Match & Post to Ledger
              </button>
              <button onClick={() => setSelectedRecord(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
