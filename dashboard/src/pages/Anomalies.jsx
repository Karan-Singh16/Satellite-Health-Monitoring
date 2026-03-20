// src/pages/Anomalies.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Anomalies.css';

// --- Scientific Helper Functions ---
// Translates the raw IF score into a human-readable 0-100% Intensity
const calculateHonestIntensity = (rawScore) => {
  if (rawScore >= 0) return 0;
  // Assumes -0.20 is a total system failure (100% deviation)
  const intensity = Math.min((Math.abs(rawScore) / 0.2) * 100, 100);
  return intensity.toFixed(1);
};

// Maps intensity to standard aerospace severity levels
const determineSeverity = (intensity) => {
  if (intensity > 80) return { level: 'CRITICAL', action: 'Immediate Emergency Reset' };
  if (intensity > 40) return { level: 'MEDIUM', action: 'Run Secondary Diagnostics' };
  return { level: 'LOW', action: 'Monitor Telemetry Trend' };
};

const Anomalies = () => {
  const [detectedAnomalies, setDetectedAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [summaryStats, setSummaryStats] = useState(null);

  // --- 1. Data Ingestion & Transformation ---
  useEffect(() => {
    const savedData = localStorage.getItem('starPulseResults');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setSummaryStats(parsedData.summary);
      
      const processedAlarms = parsedData.anomalies_only.map((row, index) => {
        const rawScore = row.IF_Anomaly_Score;
        const intensity = calculateHonestIntensity(rawScore);
        const { level, action } = determineSeverity(intensity);
        
        // Map feature names to human-readable subsystems
        const primaryFeature = row.top_causes[0]?.feature || 'Unknown';
        const subsystem = primaryFeature.includes('volt') ? 'Power (EPS)' : 
                          primaryFeature.includes('gyro') ? 'Attitude (ADCS)' : 
                          primaryFeature.includes('temp') ? 'Thermal (TCS)' : 'System Bus';

        return {
          id: `ALRM-${index + 1}`,
          time: row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'N/A',
          subsystem: subsystem,
          primaryFeature: primaryFeature,
          causes: row.top_causes || [], 
          rawScore: rawScore,
          intensity: intensity,
          severity: level,
          action: action
        };
      });

      // Show newest alarms at the top of the feed
      setDetectedAnomalies(processedAlarms.reverse());
    }
  }, []);

  // --- 2. Filtering Logic ---
  const filteredAnomalies = useMemo(() => {
    if (filterLevel === 'ALL') return detectedAnomalies;
    return detectedAnomalies.filter(a => a.severity === filterLevel);
  }, [detectedAnomalies, filterLevel]);

  // --- 3. Chart Data Formatter ---
  // Prepares the nested 'causes' array for the Recharts BarChart
  const getChartData = (causes) => {
    return causes.map(c => ({
      feature: c.feature,
      weight: parseFloat((c.score * 100).toFixed(2)) // Convert fractional weight to %
    }));
  };

  return (
    <div className="anomalies-page">
      {/* Page Header */}
      <header className="page-header">
        <div className="header-text">
          <h2>Anomaly Detection Center</h2>
          <p className="subtitle">Ensemble Analysis: Isolation Forest + LOF + OC-SVM</p>
        </div>
        <div className="ml-status">
          <span className="status-badge">Buffer: {summaryStats?.total_rows || 0} Frames</span>
          <span className="status-badge">Mode: Retrospective Batch Scoring</span>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="anomaly-layout">
        
        {/* Left Column: Alarm Feed */}
        <section className="anomaly-list-container">
          <div className="list-header">
            <div>
              <h3>Verified Flight Alarms ({filteredAnomalies.length})</h3>
              <small>Filtered via 7-point debounce window</small>
            </div>
            {/* Filter Controls */}
            <select 
              className="severity-filter" 
              value={filterLevel} 
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setSelectedAnomaly(null); // Clear workspace on filter change
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>
          
          {filteredAnomalies.length === 0 ? (
            <div className="empty-state-container">
              <p>No anomalies match the current filter criteria.</p>
              <span>Adjust your filter or upload new telemetry on the Dashboard.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="anomaly-table">
                <thead>
                  <tr>
                    <th>Alarm ID</th>
                    <th>Time</th>
                    <th>Subsystem</th>
                    <th>Intensity</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map(a => (
                    <tr 
                      key={a.id} 
                      className={`anomaly-row ${selectedAnomaly?.id === a.id ? 'active-row' : ''}`}
                      onClick={() => setSelectedAnomaly(a)}
                    >
                      <td className="id-cell">{a.id}</td>
                      <td className="time-cell">{a.time}</td>
                      <td><span className="cause-tag primary">{a.subsystem}</span></td>
                      <td className="score-cell">{a.intensity}%</td>
                      <td>
                        <span className={`severity-tag ${a.severity.toLowerCase()}`}>
                          {a.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Column: Deep Investigation Workspace */}
        <section className="analysis-view">
          <h3>Root Cause Workspace</h3>
          
          {selectedAnomaly ? (
            <div className="workspace-active">
              <div className="workspace-header">
                <h4>Investigation: {selectedAnomaly.id}</h4>
                <span className={`severity-tag ${selectedAnomaly.severity.toLowerCase()}`}>
                  {selectedAnomaly.severity} PRIORITY
                </span>
              </div>

              <div className="intel-grid">
                <div className="intel-box">
                  <small>DEVIATION INTENSITY</small>
                  <p style={{ color: selectedAnomaly.severity === 'CRITICAL' ? '#ef4444' : '#3b82f6' }}>
                    {selectedAnomaly.intensity}%
                  </p>
                </div>
                <div className="intel-box">
                  <small>TIMESTAMP</small>
                  <p>{selectedAnomaly.time}</p>
                </div>
                <div className="intel-box">
                  <small>PRIMARY FAULT</small>
                  <p style={{ color: '#10b981' }}>{selectedAnomaly.primaryFeature}</p>
                </div>
              </div>

              {/* Dynamic Feature Contribution Chart */}
              <div className="feature-chart-container">
                <h5>AI Feature Contribution Weights</h5>
                <div style={{ width: '100%', height: 220, marginTop: '10px' }}>
                  <ResponsiveContainer>
                    <BarChart data={getChartData(selectedAnomaly.causes)} layout="vertical" margin={{ left: 30, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ background: '#1a1e26', border: '1px solid #2d3139', color: '#f8fafc' }}
                        formatter={(value) => [`${value}%`, 'Weight']}
                      />
                      <Bar dataKey="weight" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Actionable Intelligence Block */}
              <div className="action-recommendation">
                 <strong>SYSTEM RECOMMENDATION:</strong> {selectedAnomaly.action}
              </div>
            </div>
          ) : (
            <div className="workspace-placeholder">
              <div className="placeholder-content">
                <p>Select an alarm from the feed to initiate a deep-packet investigation.</p>
                <div className="mock-chart-line"></div>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Anomalies;