import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { ShieldCheck, FileText } from 'lucide-react';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/reports/audit-logs');
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Audit & Security Logs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tamper-resistant audit log tracking security, login, and financial mutations
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Resource ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{log.userId?.name || 'System / Webhook'}</td>
                  <td>
                    <span className="badge badge-blue">{log.action}</span>
                  </td>
                  <td>{log.resource}</td>
                  <td style={{ fontFamily: 'monospace' }}>{log.resourceId || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit log records found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
