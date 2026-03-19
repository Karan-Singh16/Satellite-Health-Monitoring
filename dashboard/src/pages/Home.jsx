import React, { useState, useEffect } from 'react';
import './Home.css';
import SatTrackingMap from '../components/SatTrackingMap'; 

const Home = () => {
  const [satData, setSatData] = useState(null);
  
  // State for our ML Upload pipeline
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mlResults, setMlResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fetchSatelliteState = () => {
    return {
      id: "STAR-PULSE-01",
      lat: "48.8566 N",
      lon: "2.3522 E",
      alt: "542.12 km",
      velocity: "7.66 km/s",
      status: "NOMINAL",
      timestamp: new Date().toISOString()
    };
  };

  useEffect(() => {
    setSatData(fetchSatelliteState());
  }, []);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.");
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

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      console.log("ML Pipeline Success:", data);
      
      // Update the local state for the Home dashboard
      setMlResults(data); 

      // THE FIX: Filter out the boring data so we don't exceed the 5MB browser quota
      const lightweightData = {
        summary: data.summary,
        anomalies_only: data.per_row_results.filter(row => row.Flight_Ready_Anomaly === 1)
      };
      
      // Save to localStorage for Telemetry and Anomalies pages
      localStorage.setItem('starPulseResults', JSON.stringify(lightweightData));

    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3 className="sidebar-title">SATELLITE SOURCE</h3>
        <ul className="source-list">
          <li className="source-item"><span className="status-dot green"></span> ESA Mission 1</li>
          <li className="source-item"><span className="status-dot green"></span> ESA Mission 2</li>
          <li className="source-item"><span className="status-dot yellow"></span> ESA Mission 3</li>
          <li className="source-item"><span className="status-dot grey"></span> Offline-Buffer</li>
        </ul>

        {/* UPDATED: Sleek Data Ingestion UI */}
        <h3 className="sidebar-title">DATA INGESTION</h3>
        <div className="upload-container">
          
          {/* Hidden File Input & Styled Label */}
          <label 
            htmlFor="telemetry-upload" 
            className={`custom-file-upload ${selectedFile ? 'file-selected' : ''}`}
          >
            {selectedFile ? `📄 ${selectedFile.name}` : '📁 Select Telemetry File'}
          </label>
          <input 
            id="telemetry-upload" 
            type="file" 
            accept=".csv, .xlsx" 
            onChange={handleFileChange} 
          />

          {/* Styled Submit Button */}
          <button 
            className={`run-ml-btn ${isUploading ? 'loading' : ''}`}
            onClick={handleFileUpload} 
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? 'Analysing...' : 'Run Pipeline'}
          </button>
          
          {uploadError && <p className="error-text">{uploadError}</p>}
        </div>
      </aside>

      {/* Main Content Grid */}
      <main className="dashboard-grid">
        
        {/* Geo location */}
        <section className="panel geo-location">
          <div className="panel-header">
            <h4>GEO LOCATION</h4>
            <span className="api-badge live">API: LIVE N2YO</span>
          </div>
          <div className="map-placeholder">
            <SatTrackingMap /> 
          </div>
          <div className="telemetry-coordinates">
             <p>Lat: {satData?.lat} | Lon: {satData?.lon}</p>
          </div>
        </section>

        {/* Telemetry report */}
        <section className="panel telemetry-report">
          <div className="panel-header"><h4>TELEMETRY REPORT</h4></div>
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mlResults ? (
                <>
                  <tr>
                    <td>Power System</td>
                    <td>{mlResults.per_row_results[0].IF_Anomaly_Score.toFixed(2)} (Score)</td>
                    <td>
                      <span className={mlResults.summary.flight_ready_anomalies > 50 ? "badge-warn" : "badge-ok"}>
                        {mlResults.summary.flight_ready_anomalies > 50 ? "CRITICAL" : "STABLE"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Inference Latency</td>
                    <td>0.42s</td>
                    <td><span className="badge-ok">FAST</span></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="3">Awaiting Data...</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Earth observation */}
        <section className="panel earth-observation">
          <div className="panel-header"><h4>EARTH OBSERVATION</h4></div>
          <div className="image-placeholder">
            [Latest Multispectral Image Frame]
          </div>
          <div className="metadata-box" style={{marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8'}}>
            <p>Exposure: 1/4000s</p>
            <p>Filter: Near-Infrared</p>
          </div>
        </section>

        {/* Anomaly report */}
        <section className="panel anomaly-report">
          <div className="panel-header"><h4>ANOMALY REPORT</h4></div>
          <div className="chart-placeholder">
            {mlResults ? (
               <div style={{ textAlign: 'center' }}>
                 <h2 style={{ 
                    color: mlResults.summary.flight_ready_anomalies > 0 ? '#ef4444' : '#10b981',
                    fontSize: '1.5rem',
                    margin: 0
                  }}>
                    {mlResults.summary.flight_ready_anomalies > 0 ? '⚠️ ALARM TRIGGERED' : '✅ SYSTEM NOMINAL'}
                 </h2>
               </div>
            ) : (
               <span>[Awaiting Telemetry Upload...]</span>
            )}
          </div>
          
          <div className="stat-row">
            {mlResults ? (
              <>
                <p>Analyzed: <strong>{mlResults.summary.total_rows}</strong></p>
                <p>Raw Spikes: <strong>{mlResults.summary.raw_anomalies_detected}</strong></p>
                <p>Flight Alarms: <strong>{mlResults.summary.flight_ready_anomalies}</strong></p>
              </>
            ) : (
              <>
                <p>Analyzed: <strong>--</strong></p>
                <p>Flight Alarms: <strong>--</strong></p>
              </>
            )}
          </div>
        </section>

        {/* Performance metrics */}
        <section className="panel performance">
          <div className="panel-header"><h4>PERFORMANCE METRICS</h4></div>
          <div className="metric-cards">
            <div className="m-card"><small>CPU Load</small><span>14%</span></div>
            <div className="m-card"><small>MEM Usage</small><span>42%</span></div>
            <div className="m-card"><small>Link Qual</small><span>98%</span></div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;