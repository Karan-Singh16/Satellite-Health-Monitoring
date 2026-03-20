// src/pages/Anomalies.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Anomalies.css';

const calculateHonestIntensity = (rawScore) => {
  if (rawScore >= 0) return 0;
  // Assumes -0.20 is a total system failure (100% deviation)
  const intensity = Math.min((Math.abs(rawScore) / 0.2) * 100, 100);
  return intensity.toFixed(1);
};

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
        const primaryFeature = row.top_causes && row.top_causes.length > 0 ? row.top_causes[0].feature : 'Unknown';
        const subsystem = primaryFeature.includes('volt') || primaryFeature.includes('curr') || primaryFeature.includes('power') ? 'Power (EPS)' : 
                          primaryFeature.includes('gyro') || primaryFeature.includes('mag') ? 'Attitude (ADCS)' : 
                          primaryFeature.includes('temp') ? 'Thermal (TCS)' : 'System Bus';

        return {
          id: `ALRM-${index + 1}`,
          time: row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : 'N/A',
          subsystem: subsystem,
          primaryFeature: primaryFeature,
          causes: row.top_causes || [], // This is the truthful array from Django
          rawScore: rawScore,
          intensity: intensity,
          severity: level,
          action: action
        };
      });

      setDetectedAnomalies(processedAlarms.reverse());
    }
  }, []);

  const filteredAnomalies = useMemo(() => {
    if (filterLevel === 'ALL') return detectedAnomalies;
    return detectedAnomalies.filter(a => a.severity === filterLevel);
  }, [detectedAnomalies, filterLevel]);

  // Prepares the nested 'causes' array for the Recharts BarChart based purely on Django's Z-Scores
  const getChartData = (causes) => {
    if (!causes || causes.length === 0) return [];
    return causes.map(c => ({
      feature: c.feature,
      z_score: parseFloat(c.score) // Using the exact 'score' key from your Django extract_top_causes function
    }));
  };

  return (
    <div className="anomalies-page">
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

      <div className="anomaly-layout">
        
        {/* LEFT: Alarm Feed */}
        <section className="anomaly-list-container">
          <div className="list-header">
            <div>
              <h3>Verified Flight Alarms ({filteredAnomalies.length})</h3>
            </div>
            <select 
              className="severity-filter" 
              value={filterLevel} 
              onChange={(e) => { setFilterLevel(e.target.value); setSelectedAnomaly(null); }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>
          
          <div className="table-wrapper">
            <table className="anomaly-table">
              <thead>
                <tr><th>ID</th><th>Time</th><th>Subsystem</th><th>Intensity</th><th>Severity</th></tr>
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
                    <td>{a.subsystem}</td>
                    <td className="score-cell">{a.intensity}%</td>
                    <td><span className={`severity-tag ${a.severity.toLowerCase()}`}>{a.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT: Deep Investigation Workspace */}
        <section className="analysis-view">
          <h3>Root Cause Workspace</h3>
          
          {selectedAnomaly ? (
            <div className="workspace-active">
              <div className="workspace-header">
                <h4>{selectedAnomaly.id}</h4>
                <span className={`severity-tag ${selectedAnomaly.severity.toLowerCase()}`}>
                  {selectedAnomaly.severity} PRIORITY
                </span>
              </div>

              <div className="intel-grid">
                <div className="intel-box">
                  <small>DEVIATION INTENSITY</small>
                  <p style={{ color: selectedAnomaly.severity === 'CRITICAL' ? '#ef4444' : '#3b82f6' }}>{selectedAnomaly.intensity}%</p>
                </div>
                <div className="intel-box">
                  <small>PRIMARY FAULT</small>
                  <p style={{ color: '#10b981' }}>{selectedAnomaly.primaryFeature}</p>
                </div>
              </div>

              {/* TRUTHFUL FEATURE CONTRIBUTION CHART */}
              <div className="feature-chart-container">
                <h5 style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                  Sensor Z-Score Deviation from Baseline
                </h5>
                <div style={{ width: '100%', height: 220, background: '#11141b', padding: '10px', borderRadius: '4px', border: '1px solid #2d3139' }}>
                  <ResponsiveContainer>
                    <BarChart data={getChartData(selectedAnomaly.causes)} layout="vertical" margin={{ left: 30, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={10} />
                      <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={10} width={120} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{ background: '#1a1e26', border: '1px solid #2d3139', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value) => [`${value}σ (Z-Score)`, 'Deviation']}
                      />
                      <Bar dataKey="z_score" radius={[0, 4, 4, 0]}>
                        {getChartData(selectedAnomaly.causes).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Actionable Intelligence Block */}
              <div className="action-recommendation" style={{ marginTop: '2rem', padding: '1rem', background: '#11141b', border: '1px solid #2d3139', borderRadius: '4px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                 <strong style={{ color: '#3b82f6' }}>SYSTEM RECOMMENDATION:</strong> {selectedAnomaly.action}
              </div>
            </div>
          ) : (
            <div className="workspace-placeholder" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '1px dashed #2d3139', borderRadius: '4px' }}>
              <p>Select an alarm from the feed to initiate root cause analysis.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Anomalies;