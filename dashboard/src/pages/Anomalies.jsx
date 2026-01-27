// src/pages/Anomalies.jsx
import React from 'react';
import './Anomalies.css';

const Anomalies = () => {
  const mockAnomalies = [
    { id: 'AN-902', time: '12:44:05', channel: 'CH_46', type: 'Point', severity: 'Low', score: '0.82' },
    { id: 'AN-901', time: '11:20:12', channel: 'CH_41', type: 'Trend Shift', severity: 'High', score: '0.97' },
  ];

  return (
    <div className="anomalies-page">
      <header className="page-header">
        <h2>Anomaly Detection Center</h2>
        <div className="ml-status">
          <span className="status-badge">Model: IsolationForest v1.0</span>
          <span className="status-badge">Mode: Real-time Scoring</span>
        </div>
      </header>

      <div className="anomaly-layout">
        <section className="anomaly-list">
          <h3>Detected Events</h3>
          <table className="anomaly-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Time</th>
                <th>Source</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {mockAnomalies.map(a => (
                <tr key={a.id} className={a.severity.toLowerCase()}>
                  <td>{a.id}</td>
                  <td>{a.time}</td>
                  <td>{a.channel}</td>
                  <td>{a.type}</td>
                  <td><span className={`tag ${a.severity.toLowerCase()}`}>{a.severity}</span></td>
                  <td className="score-cell">{a.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* TODO: Add pagination for larger datasets */}
        </section>

        <section className="analysis-view">
          <h3>Investigation Workspace</h3>
          <div className="workspace-placeholder">
            <p>Select an anomaly from the list to view detailed feature contribution and window analysis.</p>
            {/* TODO: This area will host the main Recharts focus view */}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Anomalies;