// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('starPulseDisplayName') || localStorage.getItem('starPulseUser');
  const token = localStorage.getItem('starPulseToken');

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/telemetry/history/', {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load history');
        setHistory(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const handleLoad = async (id) => {
    setLoadingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/telemetry/history/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load upload');
      const data = await res.json();
      localStorage.setItem('starPulseResults', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <h2>Settings</h2>
          <p className="subtitle">Account &amp; Upload History</p>
        </div>
      </header>

      <div className="settings-body">

        {/* Account Card */}
        <section className="settings-card">
          <h3>Account</h3>
          <div className="account-row">
            <div className="account-avatar">{username ? username[0].toUpperCase() : '?'}</div>
            <div>
              <p className="account-name">{username}</p>
              <p className="account-label">Operator</p>
            </div>
          </div>
        </section>

        {/* History Card */}
        <section className="settings-card history-card">
          <h3>Upload History</h3>
          <p className="settings-hint">Click <strong>Load</strong> on any previous upload to restore it to the dashboard.</p>

          {loading && <p className="settings-empty">Loading history…</p>}
          {error && <p className="settings-error">{error}</p>}

          {!loading && !error && history.length === 0 && (
            <p className="settings-empty">No uploads yet. Run the pipeline from the Dashboard to get started.</p>
          )}

          {!loading && history.length > 0 && (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Filename</th>
                    <th>Uploaded</th>
                    <th>Frames</th>
                    <th>Alarms</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.id}>
                      <td className="row-num">{history.length - i}</td>
                      <td className="filename-cell">{row.filename}</td>
                      <td className="date-cell">{formatDate(row.uploaded_at)}</td>
                      <td>{row.total_rows.toLocaleString()}</td>
                      <td>
                        <span className={`alarm-badge ${row.flight_ready_anomalies > 0 ? 'has-alarms' : 'no-alarms'}`}>
                          {row.flight_ready_anomalies}
                        </span>
                      </td>
                      <td>
                        <button
                          className="load-btn"
                          onClick={() => handleLoad(row.id)}
                          disabled={loadingId === row.id}
                        >
                          {loadingId === row.id ? 'Loading…' : 'Load'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Settings;
