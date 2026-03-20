// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Home.css';
import SatTrackingMap from '../components/SatTrackingMap';

// The complete list of all 17 telemetry parameters we want to graph
const AVAILABLE_PARAMETERS = [
  { id: 'IF_Anomaly_Score', label: 'AI Risk Score (Isolation Forest)' },
  { id: 'battery_voltage', label: 'Battery Voltage (V)' },
  { id: 'average_current', label: 'Average Current (A)' },
  { id: 'EPS_temperature', label: 'EPS Temperature (°C)' },
  { id: 'BNO055_temperature', label: 'BNO055 Temperature (°C)' },
  { id: 'gyro_X', label: 'Gyro X (d/s)' },
  { id: 'gyro_Y', label: 'Gyro Y (d/s)' },
  { id: 'gyro_Z', label: 'Gyro Z (d/s)' },
  { id: 'mag_X', label: 'Mag X (uT)' },
  { id: 'mag_Y', label: 'Mag Y (uT)' },
  { id: 'mag_Z', label: 'Mag Z (uT)' },
  { id: 'delta_battery_voltage', label: 'Delta Battery Voltage (V/s)' },
  { id: 'delta_EPS_temp', label: 'Delta EPS Temp (°C/s)' },
  { id: 'delta_altitude', label: 'Delta Altitude (m/s)' },
  { id: 'mag_total', label: 'Total Mag Vector' },
  { id: 'gyro_total', label: 'Total Gyro Vector' },
  { id: 'power_discrepancy', label: 'Power Discrepancy (W)' }
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
      const response = await fetch("http://127.0.0.1:8000/api/telemetry/upload/", {
        method: "POST",
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

      // Initialize the data point with the time
      const dataPoint = { time: timeStr };

      // Attach all 17 parameters to this single time slice
      AVAILABLE_PARAMETERS.forEach(param => {
        const val = row[param.id] !== undefined ? row[param.id] : 0;
        dataPoint[param.id] = parseFloat(Number(val).toFixed(4));
      });

      return dataPoint;
    });
  }, [mlResults]);

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
          <input id="telemetry-upload" type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />

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
              <tr><th>Subsystem</th><th>Logic Condition</th><th>ML Risk</th></tr>
            </thead>
            <tbody>
              {mlResults ? (
                <>
                  <tr><td>Power (EPS)</td><td>{mlResults.summary.flight_ready_anomalies > 50 ? "Voltage Sag" : "Steady State"}</td><td><span className={mlResults.summary.flight_ready_anomalies > 50 ? "badge-warn" : "badge-ok"}>●</span></td></tr>
                  <tr><td>Thermal (TCS)</td><td>{mlResults.anomalies_only.length > 0 ? "Gradient Variance" : "Equilibrium"}</td><td><span className={mlResults.anomalies_only.length > 0 ? "badge-warn" : "badge-ok"}>●</span></td></tr>
                  <tr><td>Attitude (ADCS)</td><td>Magnetic Baseline</td><td><span className="badge-ok">●</span></td></tr>
                  <tr><td>OBDH (Computer)</td><td>Queue Nominal</td><td><span className="badge-ok">●</span></td></tr>
                  <tr><td>Comms (Link)</td><td>Signal Integrity OK</td><td><span className="badge-ok">●</span></td></tr>
                </>
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Awaiting Data...</td></tr>
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
                      <Line type="monotone" dataKey={param.id} stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
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
            <div className="m-card"><small>CONFIDENCE</small><span>{mlResults?.summary?.performance?.confidence ? `${mlResults.summary.performance.confidence}%` : '--'}</span></div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;