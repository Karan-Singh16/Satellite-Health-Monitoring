// src/pages/Telemetry.jsx
import React, { useState, useEffect } from 'react';
import './Telemetry.css';

const Telemetry = () => {
  const [logs, setLogs] = useState([]);
  
  // The complete set of 16 features used by the STAR-Pulse ML models
  const [channels, setChannels] = useState([
    // --- Raw Base Features (10) ---
    { id: 'EPS_VOLT_01', ml_feature: 'battery_voltage', label: 'Battery Voltage', value: '28.4', unit: 'V', status: 'Nominal' },
    { id: 'EPS_CURR_01', ml_feature: 'average_current', label: 'Avg Current', value: '1.24', unit: 'A', status: 'Nominal' },
    { id: 'EPS_TEMP_01', ml_feature: 'EPS_temperature', label: 'EPS Temp', value: '-12.4', unit: '°C', status: 'Nominal' },
    { id: 'BNO_TEMP_01', ml_feature: 'BNO055_temperature', label: 'BNO055 Temp', value: '18.2', unit: '°C', status: 'Nominal' },
    { id: 'GYRO_X_01', ml_feature: 'gyro_X', label: 'Gyro X', value: '0.002', unit: 'd/s', status: 'Nominal' },
    { id: 'GYRO_Y_01', ml_feature: 'gyro_Y', label: 'Gyro Y', value: '0.001', unit: 'd/s', status: 'Nominal' },
    { id: 'GYRO_Z_01', ml_feature: 'gyro_Z', label: 'Gyro Z', value: '0.005', unit: 'd/s', status: 'Nominal' },
    { id: 'MAG_X_01', ml_feature: 'mag_X', label: 'Mag X', value: '-14.2', unit: 'uT', status: 'Nominal' },
    { id: 'MAG_Y_01', ml_feature: 'mag_Y', label: 'Mag Y', value: '22.1', unit: 'uT', status: 'Nominal' },
    { id: 'MAG_Z_01', ml_feature: 'mag_Z', label: 'Mag Z', value: '8.4', unit: 'uT', status: 'Nominal' },
    
    // --- Engineered Features (6) ---
    { id: 'ENG_DELT_V', ml_feature: 'delta_battery_voltage', label: 'Delta Volt', value: '-0.01', unit: 'V/s', status: 'Nominal' },
    { id: 'ENG_DELT_T', ml_feature: 'delta_EPS_temp', label: 'Delta EPS Temp', value: '0.05', unit: '°C/s', status: 'Nominal' },
    { id: 'ENG_DELT_A', ml_feature: 'delta_altitude', label: 'Delta Altitude', value: '-1.2', unit: 'm/s', status: 'Nominal' },
    { id: 'ENG_MAG_TOT', ml_feature: 'mag_total', label: 'Total Mag Vector', value: '27.5', unit: 'uT', status: 'Nominal' },
    { id: 'ENG_GYRO_TOT', ml_feature: 'gyro_total', label: 'Total Gyro Vector', value: '0.006', unit: 'd/s', status: 'Nominal' },
    { id: 'ENG_PWR_DISC', ml_feature: 'power_discrepancy', label: 'Power Discrepancy', value: '0.12', unit: 'W', status: 'Nominal' },
  ]);

  useEffect(() => {
    const savedData = localStorage.getItem('starPulseResults');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      const newLogs = [
        `[SYSTEM] ML Pipeline Sync: OK.`,
        `[ENGINE] Summary: ${parsedData.summary.total_rows} frames analyzed.`,
        `[ENGINE] Validation: ${parsedData.summary.flight_ready_anomalies} verified flight alarms.`,
      ];

      // Sets to track which features are failing
      const primaryFailures = new Set();
      const secondaryFailures = new Set();

      parsedData.anomalies_only.forEach(row => {
        if (row.top_causes && row.top_causes.length > 0) {
          // The #1 feature is the primary cause (Red)
          primaryFailures.add(row.top_causes[0].feature);
          
          // Features #2 and #3 are secondary contributors (Amber)
          row.top_causes.slice(1).forEach(c => secondaryFailures.add(c.feature));
        }
      });

      if (primaryFailures.size > 0) {
        newLogs.push(`[CRITICAL] Primary failures detected in: ${Array.from(primaryFailures).slice(0, 3).join(', ')}`);
      }

      setLogs(newLogs);

      // Update the Telemetry Cards with 3-state logic
      setChannels(prevChannels => 
        prevChannels.map(ch => {
          if (primaryFailures.has(ch.ml_feature)) {
            return { ...ch, status: 'Severe' }; // Red
          }
          if (secondaryFailures.has(ch.ml_feature)) {
            return { ...ch, status: 'Warning' }; // Amber
          }
          return { ...ch, status: 'Nominal' }; // Green
        })
      );
    }
  }, []);

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
            <option>ML Engineering</option>
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
            <div className="card-footer">
              <small>Status: {ch.status.toUpperCase()}</small>
            </div>
          </div>
        ))}
      </div>

      <section className="raw-log">
        <h4>Pipeline Output Stream</h4>
        <div className="log-container">
          {logs.length === 0 ? (
            <p className="log-entry" style={{color: '#64748b'}}>Awaiting telemetry ingestion from dashboard...</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className={`log-entry ${log.includes('[CRITICAL]') ? 'warn' : ''}`}>
                <code>{log}</code>
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Telemetry;