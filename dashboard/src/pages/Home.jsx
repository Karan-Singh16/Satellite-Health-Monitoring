// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import './Home.css';

const Home = () => {
  const [satData, setSatData] = useState(null);

  // Stub function for Mission Control API
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

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3 className="sidebar-title">SATELLITE SOURCE</h3>
        <ul className="source-list">
          <li className="source-item"><span className="status-dot green"></span> ESA Mission 1</li>
          <li className="source-item"><span className="status-dot green"></span> Hardware-Cube</li>
          <li className="source-item"><span className="status-dot yellow"></span> NOAA-18 Sim</li>
          <li className="source-item"><span className="status-dot grey"></span> Offline-Buffer</li>
        </ul>
        {/* TODO: Add filtering or quick-action buttons here */}
      </aside>

      {/* Main Content Grid */}
      <main className="dashboard-grid">
        
        <section className="panel geo-location">
          <div className="panel-header">
            <h4>GEO LOCATION</h4>
            <span className="api-badge">API: MOCK MODE</span>
          </div>
          <div className="map-placeholder">
            {/* TODO: Integrate Leaflet or OpenLayers map here */}
            [2D Map Surface Render Placeholder]
          </div>
          <pre className="mock-json">
            {JSON.stringify(satData, null, 2)}
          </pre>
        </section>

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
              <tr><td>Power</td><td>28.4V</td><td><span className="badge-ok">OK</span></td></tr>
              <tr><td>Thermal</td><td>-12.2°C</td><td><span className="badge-ok">OK</span></td></tr>
              <tr><td>Comms</td><td>-84 dBm</td><td><span className="badge-warn">WARN</span></td></tr>
              <tr><td>ADCS</td><td>Stable</td><td><span className="badge-ok">OK</span></td></tr>
            </tbody>
          </table>
          {/* TODO: Add 'View Detailed' link to /telemetry */}
        </section>

        <section className="panel earth-observation">
          <div className="panel-header"><h4>EARTH OBSERVATION</h4></div>
          <div className="image-placeholder">
            [Latest Multispectral Image Frame]
          </div>
          <div className="metadata-box">
            <p>Exposure: 1/4000s</p>
            <p>Filter: Near-Infrared</p>
          </div>
        </section>

        <section className="panel anomaly-report">
          <div className="panel-header"><h4>ANOMALY REPORT</h4></div>
          <div className="chart-placeholder">
            {/* TODO: Integrate Recharts or Chart.js */}
            [Anomaly Probability Timeline Chart]
          </div>
          <div className="stat-row">
            <p>Daily Count: <strong>3</strong></p>
            <p>Severity: <strong>Low</strong></p>
          </div>
        </section>

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