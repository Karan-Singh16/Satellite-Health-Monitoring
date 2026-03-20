// src/pages/Telemetry.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './Telemetry.css';

const Telemetry = () => {
  const [logs, setLogs] = useState([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState('All Subsystems');
  
  // The complete set of 16 features used by the STAR-Pulse ML models
  // Added 'category' so the dropdown filter actually works
  const [channels, setChannels] = useState([
    // --- Raw Base Features (10) ---
    { id: 'EPS_VOLT_01', category: 'Power (EPS)', ml_feature: 'battery_voltage', label: 'Battery Voltage', value: '28.4', unit: 'V', status: 'Nominal' },
    { id: 'EPS_CURR_01', category: 'Power (EPS)', ml_feature: 'average_current', label: 'Avg Current', value: '1.24', unit: 'A', status: 'Nominal' },
    { id: 'EPS_TEMP_01', category: 'Thermal (TCS)', ml_feature: 'EPS_temperature', label: 'EPS Temp', value: '-12.4', unit: '°C', status: 'Nominal' },
    { id: 'BNO_TEMP_01', category: 'Thermal (TCS)', ml_feature: 'BNO055_temperature', label: 'BNO055 Temp', value: '18.2', unit: '°C', status: 'Nominal' },
    { id: 'GYRO_X_01', category: 'Attitude (AOCS)', ml_feature: 'gyro_X', label: 'Gyro X', value: '0.002', unit: 'd/s', status: 'Nominal' },
    { id: 'GYRO_Y_01', category: 'Attitude (AOCS)', ml_feature: 'gyro_Y', label: 'Gyro Y', value: '0.001', unit: 'd/s', status: 'Nominal' },
    { id: 'GYRO_Z_01', category: 'Attitude (AOCS)', ml_feature: 'gyro_Z', label: 'Gyro Z', value: '0.005', unit: 'd/s', status: 'Nominal' },
    { id: 'MAG_X_01', category: 'Attitude (AOCS)', ml_feature: 'mag_X', label: 'Mag X', value: '-14.2', unit: 'uT', status: 'Nominal' },
    { id: 'MAG_Y_01', category: 'Attitude (AOCS)', ml_feature: 'mag_Y', label: 'Mag Y', value: '22.1', unit: 'uT', status: 'Nominal' },
    { id: 'MAG_Z_01', category: 'Attitude (AOCS)', ml_feature: 'mag_Z', label: 'Mag Z', value: '8.4', unit: 'uT', status: 'Nominal' },
    
    // --- Engineered Features (6) ---
    { id: 'ENG_DELT_V', category: 'ML Engineering', ml_feature: 'delta_battery_voltage', label: 'Delta Volt', value: '-0.01', unit: 'V/s', status: 'Nominal' },
    { id: 'ENG_DELT_T', category: 'ML Engineering', ml_feature: 'delta_EPS_temp', label: 'Delta EPS Temp', value: '0.05', unit: '°C/s', status: 'Nominal' },
    { id: 'ENG_DELT_A', category: 'ML Engineering', ml_feature: 'delta_altitude', label: 'Delta Altitude', value: '-1.2', unit: 'm/s', status: 'Nominal' },
    { id: 'ENG_MAG_TOT', category: 'ML Engineering', ml_feature: 'mag_total', label: 'Total Mag Vector', value: '27.5', unit: 'uT', status: 'Nominal' },
    { id: 'ENG_GYRO_TOT', category: 'ML Engineering', ml_feature: 'gyro_total', label: 'Total Gyro Vector', value: '0.006', unit: 'd/s', status: 'Nominal' },
    { id: 'ENG_PWR_DISC', category: 'Power (EPS)', ml_feature: 'power_discrepancy', label: 'Power Discrepancy', value: '0.12', unit: 'W', status: 'Nominal' },
  ]);

  // --- 1. Handshake & AI Logic Processing ---
  useEffect(() => {
    const savedData = localStorage.getItem('starPulseResults');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // Initialize the console log stream
      const newLogs = [
        `[SYSTEM] Connecting to Local Data Buffer...`,
        `[SYSTEM] ML Pipeline Sync: OK.`,
        `[ENGINE] Summary: ${parsedData.summary.total_rows} telemetry frames analyzed.`,
        `[ENGINE] Validation: ${parsedData.summary.flight_ready_anomalies} verified flight alarms detected.`,
      ];

      // Sets to track which features are failing to drive the 3-state UI
      const primaryFailures = new Set();
      const secondaryFailures = new Set();

      parsedData.anomalies_only.forEach(row => {
        if (row.top_causes && row.top_causes.length > 0) {
          // The #1 feature is the primary cause (Red/Severe)
          primaryFailures.add(row.top_causes[0].feature);
          // Features #2 and #3 are secondary contributors (Amber/Warning)
          row.top_causes.slice(1).forEach(c => secondaryFailures.add(c.feature));
        }
      });

      if (primaryFailures.size > 0) {
        newLogs.push(`[CRITICAL] Primary fault isolation detected in: ${Array.from(primaryFailures).slice(0, 3).join(', ')}`);
        newLogs.push(`[WARN] Secondary stress indicators active across ${secondaryFailures.size} subsystems.`);
      } else {
        newLogs.push(`[SYSTEM] All sensor channels operating within clean baseline.`);
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
    } else {
      setLogs([`[AWAITING DATA] Please run the ML Pipeline from the Dashboard to ingest telemetry...`]);
    }
  }, []);

  // --- 2. Filtering Logic ---
  const filteredChannels = useMemo(() => {
    if (selectedSubsystem === 'All Subsystems') return channels;
    return channels.filter(ch => ch.category === selectedSubsystem);
  }, [channels, selectedSubsystem]);

  // --- 3. CSV Export Function ---
  const handleExportCSV = () => {
    const headers = ["Channel_ID", "ML_Feature", "Category", "Current_Value", "Unit", "AI_Status"];
    const rows = filteredChannels.map(ch => [
      ch.id, ch.ml_feature, ch.category, ch.value, ch.unit, ch.status.toUpperCase()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STAR_PULSE_TELEMETRY_SNAPSHOT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="telemetry-page">
      <header className="page-header">
        <div className="header-text">
          <h2>Telemetry Explorer</h2>
          <p className="subtitle">Real-time Multi-Channel Sensor Visualization</p>
        </div>
        
        {/* Interactive Controls */}
        <div className="controls">
          <select 
            className="subsystem-select"
            value={selectedSubsystem}
            onChange={(e) => setSelectedSubsystem(e.target.value)}
          >
            <option value="All Subsystems">All Subsystems</option>
            <option value="Power (EPS)">Power (EPS)</option>
            <option value="Thermal (TCS)">Thermal (TCS)</option>
            <option value="Attitude (AOCS)">Attitude (AOCS)</option>
            <option value="ML Engineering">ML Engineering</option>
          </select>
          <button className="export-btn" onClick={handleExportCSV}>Export CSV</button>
        </div>
      </header>

      {/* Dynamic Grid displaying the 16 features */}
      <div className="telemetry-grid">
        {filteredChannels.map((ch) => (
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
        {filteredChannels.length === 0 && (
          <p style={{ color: '#64748b', gridColumn: 'span 4', textAlign: 'center', padding: '2rem' }}>
            No channels found for this subsystem.
          </p>
        )}
      </div>

      {/* Real-time output log terminal */}
      <section className="raw-log">
        <h4>Pipeline Output Stream</h4>
        <div className="log-container">
          {logs.map((log, index) => (
            <p 
              key={index} 
              className={`log-entry ${log.includes('[CRITICAL]') || log.includes('[WARN]') ? 'warn' : ''}`}
            >
              <code>{log}</code>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Telemetry;