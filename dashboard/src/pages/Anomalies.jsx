// src/pages/Anomalies.jsx
import React, { useState, useEffect } from 'react';
import './Anomalies.css';

const Anomalies = () => {
  const [detectedAnomalies, setDetectedAnomalies] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);

  useEffect(() => {
    // 1. Pull the filtered data saved by Home.jsx
    const savedData = localStorage.getItem('starPulseResults');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setSummaryStats(parsedData.summary);
      
      // 2. Map the anomalies into a table-friendly format
      const realAlarms = parsedData.anomalies_only.map((row, index) => ({
        id: `FLT-ALRM-${index + 1}`,
        // Format ISO timestamp to local readable time
        time: row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'N/A',
        // Array of causes from the AI Root Cause Analysis
        causes: row.top_causes || [], 
        type: 'Ensemble Trigger',
        severity: 'High',
        // Raw decision function score
        score: row.IF_Anomaly_Score ? row.IF_Anomaly_Score.toFixed(4) : 'N/A'
      }));

      // 3. Newest alarms at the top
      setDetectedAnomalies(realAlarms.reverse());
    }
  }, []);

  return (
    <div className="anomalies-page">
      <header className="page-header">
        <div className="header-text">
          <h2>Anomaly Detection Center</h2>
          <p className="subtitle">Ensemble Analysis: Isolation Forest + LOF + One-Class SVM</p>
        </div>
        <div className="ml-status">
          <span className="status-badge">Model: STAR-Pulse v1.0</span>
          <span className="status-badge">Mode: Batch Scoring</span>
        </div>
      </header>

      <div className="anomaly-layout">
        <section className="anomaly-list-container">
          <div className="list-header">
            <h3>Verified Flight Alarms ({summaryStats ? summaryStats.flight_ready_anomalies : 0})</h3>
            <small>Filtered via 7-point debounce window</small>
          </div>
          
          {detectedAnomalies.length === 0 ? (
            <div className="empty-state-container">
              <p>No sustained anomalies detected in current buffer.</p>
              <span>Upload telemetry on the Dashboard to begin analysis.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="anomaly-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Root Cause Suspects</th>
                    <th>Logic</th>
                    <th>Severity</th>
                    <th>IF Score</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedAnomalies.map(a => (
                    <tr key={a.id} className="anomaly-row">
                      <td className="id-cell">{a.id}</td>
                      <td className="time-cell">{a.time}</td>
                      <td>
                        <div className="badge-stack">
                          {a.causes.map((c, i) => (
                            <span key={i} className={`cause-tag ${i === 0 ? 'primary' : ''}`}>
                              {c.feature}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="type-cell">{a.type}</td>
                      <td>
                        <span className={`severity-tag ${a.severity.toLowerCase()}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="score-cell">{a.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* This is a placeholder for future detailed graph drilling */}
        <section className="analysis-view">
          <h3>Root Cause Workspace</h3>
          <div className="workspace-placeholder">
            <div className="placeholder-content">
              <p>Select an alarm from the list to view the 3D Feature Space and Z-Score contributions.</p>
              <div className="mock-chart-line"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Anomalies;