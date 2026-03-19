// src/pages/Reports.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Reports.css';

const Reports = () => {
  const importanceData = [
    { name: 'Δ Battery Volt', value: 94, color: '#3b82f6' },
    { name: 'EPS Temp', value: 88, color: '#60a5fa' },
    { name: 'Gyro Total', value: 72, color: '#93c5fd' },
    { name: 'Altitude', value: 45, color: '#bfdbfe' },
    { name: 'Mag Z', value: 30, color: '#dbeafe' },
  ];

  return (
    <div className="reports-page">
      <header className="report-header">
        <div className="header-titles">
          <h2>Mission Evaluation Report</h2>
          <span className="model-tag">Model: STAR-Pulse Ensemble v1.0.4</span>
        </div>
        <button className="print-btn" onClick={() => window.print()}>Export PDF</button>
      </header>

      <div className="report-container">
        <div className="metrics-grid">
          <div className="metric-card">
            <h5>F1-SCORE</h5>
            <p>0.942</p>
            <small>Optimal Balance</small>
          </div>
          <div className="metric-card">
            <h5>ACCURACY</h5>
            <p>98.1%</p>
            <small>Over 75k frames</small>
          </div>
          <div className="metric-card">
            <h5>PRECISION</h5>
            <p>0.925</p>
            <small>Low False Alarms</small>
          </div>
        </div>

        <div className="analysis-row">
          <section className="chart-section matrix-box">
            <h3>Confusion Matrix</h3>
            <div className="matrix-grid">
              <div className="matrix-cell tp"><small>TRUE POSITIVE</small><span>1,084</span></div>
              <div className="matrix-cell fp"><small>FALSE POSITIVE</small><span>42</span></div>
              <div className="matrix-cell fn"><small>FALSE NEGATIVE</small><span>12</span></div>
              <div className="matrix-cell tn"><small>TRUE NEGATIVE</small><span>74,856</span></div>
            </div>
            <div className="formula-display">
               F1 = 2 * (Precision * Recall) / (Precision + Recall)
            </div>
          </section>

          <section className="chart-section importance-box">
            <h3>Feature Importance (AI Weighting)</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={importanceData} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1a1e26', border: '1px solid #2d3139', borderRadius: '4px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {importanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="report-card conclusion">
          <h3>Technical Summary</h3>
          <p>
            The STAR-Pulse ensemble model demonstrates high sensitivity to battery voltage deltas 
            and thermal fluctuations. Current validation indicates a robust 7-point debounce 
            mechanism effectively eliminates transient noise while maintaining a 96% recall rate.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Reports;