import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { AlertTriangle, Send, PhoneCall, Calendar } from 'lucide-react';

export const Collections = () => {
  const [summary, setSummary] = useState(null);
  const [aging, setAging] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollectionsData();
  }, []);

  const fetchCollectionsData = async () => {
    try {
      const summaryRes = await apiFetch('/collections/summary');
      setSummary(summaryRes.data.summary);
      setAging(summaryRes.data.aging);

      const overdueRes = await apiFetch('/collections/overdue');
      setOverdue(overdueRes.data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (customerId, name) => {
    try {
      await apiFetch('/collections/remind', {
        method: 'POST',
        body: JSON.stringify({ customerId, channel: 'WHATSAPP' })
      });
      alert(`WhatsApp payment reminder dispatched to ${name}!`);
    } catch (err) {
      alert(`Reminder dispatch error: ${err.message}`);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading collections aging metrics...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Collections & Aging Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Monitor overdue credit, analyze debt aging buckets, and dispatch automated WhatsApp reminders
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card amber">
          <span className="kpi-label">Total Receivables</span>
          <div className="kpi-value">Rs. {summary?.totalOutstandingPKR}</div>
          <span className="kpi-subtext">Across {summary?.totalDebtorsCount} debtors</span>
        </div>

        <div className="kpi-card rose">
          <span className="kpi-label">Overdue Balance (&gt; 7 Days)</span>
          <div className="kpi-value">Rs. {summary?.overdueAmountPKR}</div>
          <span className="kpi-subtext">Requires immediate follow-up</span>
        </div>
      </div>

      {/* Aging Breakdown Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Receivables Aging Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>0 - 7 Days</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
              Rs. {aging?.days0to7PKR}
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>8 - 30 Days</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
              Rs. {aging?.days8to30PKR}
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>31 - 60 Days</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
              Rs. {aging?.days31to60PKR}
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>61 - 90 Days</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '0.25rem' }}>
              Rs. {aging?.days61to90PKR}
            </div>
          </div>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>90+ Days (Critical)</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
              Rs. {aging?.days90PlusPKR}
            </div>
          </div>
        </div>
      </div>

      {/* Top Overdue Debtors Table */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={20} color="var(--accent-rose)" />
          Ranked Debtors List
        </h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Outstanding Debt (PKR)</th>
                <th>Days Since Last Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td>{c.phone}</td>
                  <td style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>
                    Rs. {c.currentBalancePKR}
                  </td>
                  <td>
                    {c.daysSinceLastPayment !== null ? `${c.daysSinceLastPayment} days ago` : 'No payments yet'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleSendReminder(c.id, c.name)}
                      className="btn btn-amber"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Send size={14} />
                      WhatsApp Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
