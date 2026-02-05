// src/pages/Telemetry.jsx
import React, { useState } from 'react';
import './Telemetry.css';

const Telemetry = () => {
  // ESA dataset structure (Anonymized Channels)
  const [channels] = useState([
    { id: 'channel_41', label: 'EPS_VOLT_01', value: '28.42', unit: 'V', status: 'Nominal' },
    { id: 'channel_42', label: 'EPS_CURR_01', value: '1.24', unit: 'A', status: 'Nominal' },
    { id: 'channel_43', label: 'TCS_TEMP_01', value: '-12.4', unit: '°C', status: 'Nominal' },
    { id: 'channel_44', label: 'AOCS_GYRO_X', value: '0.002', unit: 'deg/s', status: 'Nominal' },
    { id: 'channel_45', label: 'AOCS_GYRO_Y', value: '0.001', unit: 'deg/s', status: 'Nominal' },
    { id: 'channel_46', label: 'COMMS_SNR', value: '14.2', unit: 'dB', status: 'Warning' },
  ]);

  return (
    <div className="telemetry-page">
      <header className="page-header">
        <h2>Telemetry Explorer</h2>
        <div className="controls">
          <select className="subsystem-select">
            <option>All Subsystems</option>
            <option>Power (EPS)</option>
            <option>Thermal (TCS)</option>
            <option>Attitude (AOCS)</option>
          </select>
          <button className="export-btn">Export CSV</button>
        </div>
      </header>

      <div className="telemetry-grid">
        {channels.map((ch) => (
          <div key={ch.id} className={`telemetry-card ${ch.status.toLowerCase()}`}>
            <div className="card-top">
              <span className="channel-id">{ch.id}</span>
              <span className="status-indicator"></span>
            </div>
            <div className="card-main">
              <div className="value-display">
                <span className="value">{ch.value}</span>
                <span className="unit">{ch.unit}</span>
              </div>
              <div className="label-display">{ch.label}</div>
            </div>
            {/* Add mini sparkline chart here later */}
            <div className="card-footer">
              <small>Last updated: 2s ago</small>
            </div>
          </div>
        ))}
      </div>

      <section className="raw-log">
        <h4>Recent Data Packets</h4>
        <div className="log-container">
          {/* Map live data stream here */}
          <p className="log-entry"><code>[12:44:01] INGEST: Packet Received from ESA_MISSION_1 (Size: 1024b)</code></p>
          <p className="log-entry"><code>[12:44:03] DECODE: CH_41 -> 28.42V, CH_42 -> 1.24A</code></p>
          <p className="log-entry warn"><code>[12:44:05] ALERT: CH_46 SNR below threshold (14.2 dB)</code></p>
        </div>
      </section>
    </div>
  );
};

export default Telemetry;