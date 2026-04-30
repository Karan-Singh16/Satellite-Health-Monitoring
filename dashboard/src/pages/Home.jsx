// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import './Home.css';
import SatTrackingMap from '../components/SatTrackingMap';

// The complete list of telemetry parameters from the Improved ML Model
const AVAILABLE_PARAMETERS = [
  { id: 'IF_Anomaly_Score', label: 'AI Risk Score (Isolation Forest)' },
  { id: 'battery_voltage', label: 'Battery Voltage (V)' },
  { id: 'average_current', label: 'Average Current (mA)' },
  { id: 'average_power', label: 'Average Power (W)' },
  { id: 'remaining_capacity', label: 'Remaining Capacity (mAh)' },
  { id: 'EPS_temperature', label: 'EPS Temperature (°C)' },
  { id: 'ADCS_temperature1', label: 'ADCS Temperature (°C)' },
  { id: 'BNO055_temperature', label: 'BNO055 Temperature (°C)' },
  { id: 'gyro_X', label: 'Gyro X (°/s)' },
  { id: 'gyro_Y', label: 'Gyro Y (°/s)' },
  { id: 'gyro_Z', label: 'Gyro Z (°/s)' }
];

const Home = () => {
  const [satData, setSatData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mlResults, setMlResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem('starPulseResults');
    if (savedData) setMlResults(JSON.parse(savedData));
    
    setSatData({
      id: "STAR-PULSE-01", lat: "48.8566 N", lon: "2.3522 E", alt: "542.12 km", status: "NOMINAL"
    });
  }, []);

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const token = localStorage.getItem('starPulseToken');
      const response = await fetch("http://127.0.0.1:8000/api/telemetry/upload/", {
        method: "POST",
        headers: token ? { Authorization: `Token ${token}` } : {},
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Inference Engine Error");

      const persistentData = {
        summary: data.summary,
        anomalies_only: data.per_row_results.filter(row => row.Flight_Ready_Anomaly === 1),
        // Grab the first 150 rows so the graphs are dense but performant
        timeseries: data.per_row_results.slice(0, 150) 
      };

      setMlResults(persistentData);
      localStorage.setItem('starPulseResults', JSON.stringify(persistentData));

    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('starPulseResults');
    setMlResults(null);
    setSelectedFile(null);
    window.location.reload(); 
  };

  // --- OMNI-GRAPH ENGINE ---
  // Transforms the Django JSON into a format Recharts can easily plot for EVERY parameter
  const graphData = useMemo(() => {
    if (!mlResults || !mlResults.timeseries) return [];
    
    return mlResults.timeseries.map((row) => {
      // Convert the raw ISO timestamp into a clean HH:MM:SS string
      let timeStr = "N/A";
      if (row.timestamp) {
        const dateObj = new Date(row.timestamp);
        timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }

      const dataPoint = {
        time: timeStr,
        isAnomaly: row.Final_Anomaly === 1,
      };

      AVAILABLE_PARAMETERS.forEach(param => {
        const val = row[param.id] !== undefined ? row[param.id] : 0;
        dataPoint[param.id] = parseFloat(Number(val).toFixed(4));
      });

      return dataPoint;
    });
  }, [mlResults]);

  // Renders a red X marker for anomaly points, nothing for normal points 
  const AnomalyDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload?.isAnomaly) return null;
    return (
      <g key={`anomaly-${cx}-${cy}`}>
        <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke="#ef4444" strokeWidth={2} />
        <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke="#ef4444" strokeWidth={2} />
      </g>
    );
  };

  return (
    <div className="home-layout">
      <aside className="sidebar">
        <h3 className="sidebar-title">SATELLITE SOURCE</h3>
        <ul className="source-list">
          <li className="source-item active"><span className="status-dot green"></span> ESA Mission 1</li>
          <li className="source-item"><span className="status-dot grey"></span> Offline-Buffer</li>
        </ul>

        <h3 className="sidebar-title">DATA INGESTION</h3>
        <div className="upload-container">
          <label htmlFor="telemetry-upload" className={`custom-file-upload ${selectedFile ? 'file-selected' : ''}`}>
            {selectedFile ? `📄 ${selectedFile.name}` : '📁 Select Telemetry File'}
          </label>
          <input id="telemetry-upload" type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />

          <button className={`run-ml-btn ${isUploading ? 'loading' : ''}`} onClick={handleFileUpload} disabled={isUploading || !selectedFile}>
            {isUploading ? 'ANALYSING...' : 'RUN PIPELINE'}
          </button>
          
          {mlResults && (
            <button className="run-ml-btn reset-btn" onClick={handleReset}>RESET DASHBOARD</button>
          )}
          {uploadError && <p className="error-text">{uploadError}</p>}
        </div>
      </aside>

      <main className="dashboard-grid">
        
        {/* GEO & SUBSYSTEMS */}
        <section className="panel">
          <div className="panel-header">
            <h4>GEO-SPATIAL TRACKING</h4><span className="api-badge">API: LIVE</span>
          </div>
          <div className="map-placeholder"><SatTrackingMap /></div>
          <div className="telemetry-coordinates">
             <p>LAT: {satData?.lat} | LON: {satData?.lon} | ALT: {satData?.alt}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h4>SUBSYSTEM ANALYTICS</h4></div>
          <table className="telemetry-table">
            <thead>
              <tr><th>Subsystem</th><th>Condition</th><th>ML Risk</th></tr>
            </thead>
            <tbody>
              {mlResults ? (() => {
                const EPS_FEATS  = new Set(['battery_voltage','average_current','average_power','remaining_capacity']);
                const TCS_FEATS  = new Set(['EPS_temperature','ADCS_temperature1','BNO055_temperature']);
                const ADCS_FEATS = new Set(['gyro_X','gyro_Y','gyro_Z']);

                const counts = { eps: 0, tcs: 0, adcs: 0 };
                (mlResults.anomalies_only || []).forEach(row => {
                  (row.top_causes || []).forEach(c => {
                    if (EPS_FEATS.has(c.feature))  counts.eps++;
                    if (TCS_FEATS.has(c.feature))  counts.tcs++;
                    if (ADCS_FEATS.has(c.feature)) counts.adcs++;
                  });
                });

                const badge = (n) => n > 0
                  ? <span className="badge-warn">●</span>
                  : <span className="badge-ok">●</span>;

                return (
                  <>
                    <tr><td>Power (EPS)</td><td>{counts.eps > 0 ? `${counts.eps} flag(s) detected` : 'Steady State'}</td><td>{badge(counts.eps)}</td></tr>
                    <tr><td>Thermal (TCS)</td><td>{counts.tcs > 0 ? `${counts.tcs} flag(s) detected` : 'Equilibrium'}</td><td>{badge(counts.tcs)}</td></tr>
                    <tr><td>Attitude (ADCS)</td><td>{counts.adcs > 0 ? `${counts.adcs} flag(s) detected` : 'Stable'}</td><td>{badge(counts.adcs)}</td></tr>
                  </>
                );
              })() : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Upload telemetry to analyse subsystems</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* --- NEW: SCROLLABLE MASTER CHART GRID --- */}
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-header">
            <h4>LIVE TELEMETRY TRENDS (ALL PARAMETERS)</h4>
          </div>
          
          {mlResults && mlResults.timeseries ? (
            <>
            <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>
              <span><span style={{ color: '#3b82f6', fontWeight: 700 }}>—</span> Nominal telemetry</span>
              <span><span style={{ color: '#ef4444', fontWeight: 700 }}>✕</span> Ensemble anomaly flag</span>
            </div>
            <div className="charts-grid-scrollable">
              {AVAILABLE_PARAMETERS.map((param) => (
                <div key={param.id} className="mini-chart-wrapper">
                  <h6 className="mini-chart-title">{param.label}</h6>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" vertical={false} />
                      {/* X-Axis now uses the actual HH:MM:SS time string */}
                      <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickMargin={5} minTickGap={30} />
                      <YAxis stroke="#64748b" fontSize={9} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#11141b', border: '1px solid #2d3139', borderRadius: '4px', fontSize: '11px' }}
                        itemStyle={{ color: '#3b82f6', fontFamily: 'monospace' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Line type="monotone" dataKey={param.id} stroke="#3b82f6" strokeWidth={1.5} dot={<AnomalyDot />} activeDot={{ r: 4, fill: '#60a5fa' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
            </>
          ) : (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '1px dashed #2d3139', borderRadius: '4px' }}>
              Run Pipeline to render all telemetry trends
            </div>
          )}
        </section>

        {/* ML STATUS & PERFORMANCE */}
        <section className="panel">
          <div className="panel-header"><h4>AI CLASSIFIER STATUS</h4></div>
          <div className="alarm-display">
            {mlResults ? (
               <div className={mlResults.summary.flight_ready_anomalies > 0 ? "alarm-box active" : "alarm-box nominal"}>
                 {mlResults.summary.flight_ready_anomalies > 0 ? "⚠️ ALARM TRIGGERED" : "✅ SYSTEM NOMINAL"}
               </div>
            ) : (
               <div className="alarm-box standby">STANDBY</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h4>MODEL PERFORMANCE</h4></div>
          <div className="metric-cards">
            <div className="m-card"><small>INFERENCE</small><span>{mlResults?.summary?.performance?.latency ? `${mlResults.summary.performance.latency}s` : '--'}</span></div>
            <div className="m-card"><small>THROUGHPUT</small><span>{mlResults?.summary?.performance?.throughput ? `${mlResults.summary.performance.throughput} f/s` : '--'}</span></div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;