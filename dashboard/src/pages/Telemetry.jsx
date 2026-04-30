// src/pages/Telemetry.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './Telemetry.css';

// Exactly the 10 features used by the ML ensemble — no more, no less
const TELEMETRY_MAP = [
  { id: 'EPS_VOLT_01', ml_feature: 'battery_voltage',    category: 'Power (EPS)',    label: 'Battery Voltage',     unit: 'V'   },
  { id: 'EPS_CURR_01', ml_feature: 'average_current',    category: 'Power (EPS)',    label: 'Avg Current',         unit: 'mA'  },
  { id: 'EPS_PWR_01',  ml_feature: 'average_power',      category: 'Power (EPS)',    label: 'Avg Power',           unit: 'W'   },
  { id: 'EPS_CAP_01',  ml_feature: 'remaining_capacity', category: 'Power (EPS)',    label: 'Remaining Capacity',  unit: 'mAh' },
  { id: 'GYRO_X_01',  ml_feature: 'gyro_X',             category: 'Attitude (ADCS)', label: 'Gyro X',             unit: '°/s' },
  { id: 'GYRO_Y_01',  ml_feature: 'gyro_Y',             category: 'Attitude (ADCS)', label: 'Gyro Y',             unit: '°/s' },
  { id: 'GYRO_Z_01',  ml_feature: 'gyro_Z',             category: 'Attitude (ADCS)', label: 'Gyro Z',             unit: '°/s' },
  { id: 'EPS_TEMP_01', ml_feature: 'EPS_temperature',   category: 'Thermal (TCS)',  label: 'EPS Temperature',     unit: '°C'  },
  { id: 'ADCS_TMP_01', ml_feature: 'ADCS_temperature1', category: 'Thermal (TCS)',  label: 'ADCS Temperature',    unit: '°C'  },
  { id: 'BNO_TEMP_01', ml_feature: 'BNO055_temperature', category: 'Thermal (TCS)', label: 'BNO055 Temperature',  unit: '°C'  },
];

const Telemetry = () => {
  const [logs, setLogs] = useState([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState('All Subsystems');
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const savedData = localStorage.getItem('starPulseResults');
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      const perf = parsedData.summary.performance || {};
      
      // 1. TRUTHFUL TERMINAL LOGS
      const newLogs = [
        `[SYSTEM] Connected to Django ML Backend.`,
        `[ENGINE] Processed ${parsedData.summary.total_rows} frames in ${perf.latency || '--'}s.`,
        `[ENGINE] Pipeline Throughput: ${perf.throughput || '--'} frames/sec.`,
        `[ENGINE] Flight-Ready Alarms Detected: ${parsedData.summary.flight_ready_anomalies}`
      ];

      // 2. ANALYZE MISSION HEALTH (Determine Red/Amber/Green states)
      const primaryFailures = new Set();
      const secondaryFailures = new Set();

      parsedData.anomalies_only.forEach(row => {
        if (row.top_causes && row.top_causes.length > 0) {
          primaryFailures.add(row.top_causes[0].feature); // Primary cause is SEVERE (Red)
          row.top_causes.slice(1).forEach(c => secondaryFailures.add(c.feature)); // Others are WARNING (Amber)
        }
      });

      if (primaryFailures.size > 0) {
        newLogs.push(`[CRITICAL] Fault isolation active. Compromised subsystems detected.`);
      } else {
        newLogs.push(`[SYSTEM] All sensor channels operating within clean baseline.`);
      }

      setLogs(newLogs);

      // 3. MAP REAL DATA TO UI CHANNELS
      // Grab the absolute latest row of data from the timeseries snapshot to act as our "Live" value
      const latestRow = parsedData.timeseries && parsedData.timeseries.length > 0 
        ? parsedData.timeseries[parsedData.timeseries.length - 1] 
        : {};

      const mappedChannels = TELEMETRY_MAP.map(ch => {
        // Read truthful value from Django JSON, default to 0 if missing
        const rawValue = latestRow[ch.ml_feature] !== undefined ? latestRow[ch.ml_feature] : 0;
        
        let status = 'Nominal';
        if (primaryFailures.has(ch.ml_feature)) status = 'Severe';
        else if (secondaryFailures.has(ch.ml_feature)) status = 'Warning';

        return {
          ...ch,
          value: parseFloat(Number(rawValue).toFixed(3)),
          status: status
        };
      });

      setChannels(mappedChannels);
    } else {
      setLogs([`[AWAITING DATA] Please run the ML Pipeline from the Dashboard to ingest telemetry...`]);
      // Load empty skeleton if no data
      setChannels(TELEMETRY_MAP.map(ch => ({ ...ch, value: '--', status: 'Nominal' })));
    }
  }, []);

  const filteredChannels = useMemo(() => {
    if (selectedSubsystem === 'All Subsystems') return channels;
    return channels.filter(ch => ch.category === selectedSubsystem);
  }, [channels, selectedSubsystem]);

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
          <p className="subtitle">Real-Time Multi-Channel Sensor Visualization</p>
        </div>
        
        <div className="controls">
          <select 
            className="subsystem-select"
            value={selectedSubsystem}
            onChange={(e) => setSelectedSubsystem(e.target.value)}
          >
            <option value="All Subsystems">All Subsystems</option>
            <option value="Power (EPS)">Power (EPS)</option>
            <option value="Thermal (TCS)">Thermal (TCS)</option>
            <option value="Attitude (ADCS)">Attitude (ADCS)</option>
          </select>
          <button className="export-btn" onClick={handleExportCSV}>EXPORT CSV</button>
        </div>
      </header>

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
              <small>STATUS: {ch.status.toUpperCase()}</small>
            </div>
          </div>
        ))}
        {filteredChannels.length === 0 && (
          <p style={{ color: '#64748b', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            No channels found for this subsystem.
          </p>
        )}
      </div>

      <section className="raw-log">
        <h4>Backend Execution Stream</h4>
        <div className="log-container">
          {logs.map((log, index) => (
            <p key={index} className={`log-entry ${log.includes('[CRITICAL]') ? 'critical' : ''}`}>
              <code>{log}</code>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Telemetry;