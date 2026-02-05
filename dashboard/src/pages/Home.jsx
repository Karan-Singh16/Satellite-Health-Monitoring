import React, { useState, useEffect } from 'react';
import './Home.css';
import SatTrackingMap from '../components/SatTrackingMap'; 

const Home = () => {
  const [satData, setSatData] = useState(null);

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
          <li className="source-item"><span className="status-dot green"></span> ESA Mission 2</li>
          <li className="source-item"><span className="status-dot yellow"></span> ESA Mission 3</li>
          <li className="source-item"><span className="status-dot grey"></span> Offline-Buffer</li>
        </ul>
      </aside>

      {/* Main Content Grid */}
      <main className="dashboard-grid">
        
        {/* Geo location */}
        <section className="panel geo-location">
          <div className="panel-header">
            <h4>GEO LOCATION</h4>
            <span className="api-badge live">API: LIVE N2YO</span>
          </div>
          
          <div className="map-placeholder" style={{ height: '350px', width: '100%' }}>
            <SatTrackingMap /> 
          </div>

          <div className="telemetry-coordinates">
             <p>Lat: {satData?.lat} | Lon: {satData?.lon}</p>
          </div>
          <pre className="mock-json">
            {JSON.stringify(satData, null, 2)}
          </pre>
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
              <tr><td>Power</td><td>28.4V</td><td><span className="badge-ok">OK</span></td></tr>
              <tr><td>Thermal</td><td>-12.2°C</td><td><span className="badge-ok">OK</span></td></tr>
              <tr><td>Comms</td><td>-84 dBm</td><td><span className="badge-warn">WARN</span></td></tr>
              <tr><td>ADCS</td><td>Stable</td><td><span className="badge-ok">OK</span></td></tr>
            </tbody>
          </table>
        </section>

        {/* Earth observation */}
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

        {/* Anomaly report */}
        <section className="panel anomaly-report">
          <div className="panel-header"><h4>ANOMALY REPORT</h4></div>
          <div className="chart-placeholder">
            [Anomaly Probability Timeline Chart]
          </div>
          <div className="stat-row">
            <p>Daily Count: <strong>3</strong></p>
            <p>Severity: <strong>Low</strong></p>
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