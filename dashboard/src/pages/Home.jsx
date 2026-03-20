// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.css';
import SatTrackingMap from '../components/SatTrackingMap'; 

const Home = () => {
  // --- State Management ---
  const [satData, setSatData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mlResults, setMlResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // --- 1. Persistence & Mock Data Handshake ---
  useEffect(() => {
    // Check LocalStorage so the dashboard doesn't "wipe" on refresh or tab change
    const savedData = localStorage.getItem('starPulseResults');
    if (savedData) {
      setMlResults(JSON.parse(savedData));
    }

    // Initialize mock satellite telemetry for the Geo-Panel
    setSatData({
      id: "STAR-PULSE-01",
      lat: "48.8566 N",
      lon: "2.3522 E",
      alt: "542.12 km",
      velocity: "7.66 km/s",
      status: "NOMINAL"
    });
  }, []);

  // --- 2. File Ingestion Handlers ---
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a telemetry file.");
      return;
    }

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

      // SAVE TO LOCALSTORAGE: Strip heavy data to keep only what's needed for other tabs
      const persistentData = {
        summary: data.summary,
        anomalies_only: data.per_row_results.filter(row => row.Flight_Ready_Anomaly === 1)
      };

      setMlResults(persistentData);
      localStorage.setItem('starPulseResults', JSON.stringify(persistentData));

    } catch (error) {
      console.error("Pipeline Error:", error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. System Reset ---
  const handleReset = () => {
    localStorage.removeItem('starPulseResults');
    setMlResults(null);
    setSelectedFile(null);
    window.location.reload(); // Hard reset to clear all component states
  };

  return (
    <div className="home-layout">
      {/* --- Sidebar Navigation & Controls --- */}
      <aside className="sidebar">
        <h3 className="sidebar-title">SATELLITE SOURCE</h3>
        <ul className="source-list">
          <li className="source-item active"><span className="status-dot green"></span> ESA Mission 1</li>
          <li className="source-item"><span className="status-dot green"></span> ESA Mission 2</li>
          <li className="source-item"><span className="status-dot yellow"></span> ESA Mission 3</li>
          <li className="source-item"><span className="status-dot grey"></span> Offline-Buffer</li>
        </ul>

        <h3 className="sidebar-title">DATA INGESTION</h3>
        <div className="upload-container">
          <label 
            htmlFor="telemetry-upload" 
            className={`custom-file-upload ${selectedFile ? 'file-selected' : ''}`}
          >
            {selectedFile ? `📄 ${selectedFile.name}` : '📁 Select Telemetry File'}
          </label>
          <input 
            id="telemetry-upload" 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
          />

          <button 
            className={`run-ml-btn ${isUploading ? 'loading' : ''}`}
            onClick={handleFileUpload} 
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? 'ANALYSING...' : 'RUN PIPELINE'}
          </button>
          
          {mlResults && (
            <button className="run-ml-btn reset-btn" onClick={handleReset}>
              RESET DASHBOARD
            </button>
          )}

          {uploadError && <p className="error-text">{uploadError}</p>}
        </div>
      </aside>

      {/* --- Main Mission Control Grid --- */}
      <main className="dashboard-grid">
        
        {/* Row 1: Geo-Location & Subsystem Health */}
        <section className="panel">
          <div className="panel-header">
            <h4>GEO-SPATIAL TRACKING</h4>
            <span className="api-badge live">API: LIVE N2YO</span>
          </div>
          <div className="map-placeholder">
            <SatTrackingMap />
          </div>
          <div className="telemetry-coordinates">
             <p>LAT: {satData?.lat} | LON: {satData?.lon} | ALT: {satData?.alt}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h4>SUBSYSTEM ANALYTICS</h4></div>
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Logic Condition</th>
                <th>ML Risk</th>
              </tr>
            </thead>
            <tbody>
              {mlResults ? (
                <>
                  <tr>
                    <td>Power (EPS)</td>
                    <td>{mlResults.summary.flight_ready_anomalies > 50 ? "Bus Voltage Sag" : "Steady State"}</td>
                    <td><span className={mlResults.summary.flight_ready_anomalies > 50 ? "badge-warn" : "badge-ok"}>●</span></td>
                  </tr>
                  <tr>
                    <td>Thermal (TCS)</td>
                    <td>{mlResults.anomalies_only.length > 0 ? "Gradient Variance" : "Equilibrium"}</td>
                    <td><span className={mlResults.anomalies_only.length > 0 ? "badge-warn" : "badge-ok"}>●</span></td>
                  </tr>
                  <tr>
                    <td>ADCS (Attitude)</td>
                    <td>Magnetic Baseline</td>
                    <td><span className="badge-ok">●</span></td>
                  </tr>
                  <tr>
                    <td>OBDH (Computer)</td>
                    <td>Queue Nominal</td>
                    <td><span className="badge-ok">●</span></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Awaiting Data Ingestion...</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Row 2: Earth Observation & AI Status */}
        <section className="panel">
          <div className="panel-header"><h4>EARTH OBSERVATION</h4></div>
          <div className="image-placeholder">
            [Optical Downlink Standby]
          </div>
          <div className="metadata-box" style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#64748b' }}>
            <p>Filter: Multispectral (NIR/SWIR)</p>
            <p>Status: Synchronizing with Mission 1...</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header"><h4>AI CLASSIFIER STATUS</h4></div>
          <div className="alarm-display">
            {mlResults ? (
               <div className={mlResults.summary.flight_ready_anomalies > 0 ? "alarm-box active" : "alarm-box nominal"}>
                 {mlResults.summary.flight_ready_anomalies > 0 ? "⚠️ ALARM TRIGGERED" : "✅ SYSTEM NOMINAL"}
               </div>
            ) : (
               <div className="alarm-box standby">STANDBY FOR TELEMETRY</div>
            )}
          </div>
          <div className="stat-row" style={{ marginTop: '1.2rem' }}>
            <p>Frames Analyzed: <strong>{mlResults?.summary.total_rows || '--'}</strong></p>
            <p>Verified Alarms: <strong>{mlResults?.summary.flight_ready_anomalies || '--'}</strong></p>
          </div>
        </section>

        {/* Row 3: Model Performance Cards */}
        <section className="panel performance-panel">
          <div className="panel-header"><h4>MODEL PERFORMANCE</h4></div>
          <div className="metric-cards">
            <div className="m-card">
              <small>AVG INFERENCE</small>
              <span>{mlResults ? '0.42s' : '--'}</span>
            </div>
            <div className="m-card">
              <small>THROUGHPUT</small>
              <span>{mlResults ? '180 f/s' : '--'}</span>
            </div>
            <div className="m-card">
              <small>AI CONFIDENCE</small>
              <span>{mlResults ? '98.4%' : '--'}</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;