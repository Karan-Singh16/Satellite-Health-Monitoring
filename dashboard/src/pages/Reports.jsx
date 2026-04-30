// src/pages/Reports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Reports.css';

const FEATURE_LABELS = {
  battery_voltage: 'Battery Voltage',
  average_current: 'Avg Current',
  average_power: 'Avg Power',
  remaining_capacity: 'Remaining Cap.',
  gyro_X: 'Gyro X',
  gyro_Y: 'Gyro Y',
  gyro_Z: 'Gyro Z',
  EPS_temperature: 'EPS Temp',
  ADCS_temperature1: 'ADCS Temp',
  BNO055_temperature: 'BNO055 Temp',
};

const CHART_COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
  '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
];

const Reports = () => {
  const [data, setData] = useState(null);
  const [trainMetrics, setTrainMetrics] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkFile, setBenchmarkFile] = useState(null);
  const [benchmarkUploading, setBenchmarkUploading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState(null);
  const token = localStorage.getItem('starPulseToken');

  useEffect(() => {
    const saved = localStorage.getItem('starPulseResults');
    if (saved) setData(JSON.parse(saved));

    const savedBenchmark = localStorage.getItem('starPulseBenchmark');
    if (savedBenchmark) setBenchmark(JSON.parse(savedBenchmark));

    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/metrics/");
        if (response.ok) setTrainMetrics(await response.json());
      } catch (error) {
        console.error("Failed to fetch training metrics:", error);
      }
    };

    const fetchBenchmark = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/telemetry/benchmark/latest/", {
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          const bm = await res.json();
          setBenchmark(bm);
          localStorage.setItem('starPulseBenchmark', JSON.stringify(bm));
        }
      } catch (_) {}
    };

    fetchMetrics();
    fetchBenchmark();
  }, [token]);

  const handleBenchmarkUpload = async () => {
    if (!benchmarkFile) return;
    setBenchmarkUploading(true);
    setBenchmarkError(null);
    const formData = new FormData();
    formData.append('file', benchmarkFile);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/telemetry/benchmark/", {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Benchmark upload failed');
      setBenchmark(result);
      localStorage.setItem('starPulseBenchmark', JSON.stringify(result));
      setBenchmarkFile(null);
    } catch (err) {
      setBenchmarkError(err.message);
    } finally {
      setBenchmarkUploading(false);
    }
  };

  const perf = data?.summary?.performance || {};

  // Feature importance from the current upload session (count of top_causes appearances)
  const sessionImportanceData = useMemo(() => {
    if (!data?.anomalies_only?.length) return null;
    const counts = {};
    for (const row of data.anomalies_only) {
      for (const cause of (row.top_causes || [])) {
        counts[cause.feature] = (counts[cause.feature] || 0) + 1;
      }
    }
    if (!Object.keys(counts).length) return null;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count], i) => ({
        name: FEATURE_LABELS[feature] || feature,
        value: count,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [data]);

  // Fall back to training-derived trigger counts when no session data
  const trainingImportanceData = useMemo(() => {
    if (!trainMetrics?.feature_trigger_counts) return null;
    return Object.entries(trainMetrics.feature_trigger_counts)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, count], i) => ({
        name: FEATURE_LABELS[feature] || feature,
        value: count,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [trainMetrics]);

  const importanceData = sessionImportanceData || trainingImportanceData;
  const importanceSource = sessionImportanceData ? 'Current Session' : 'Training Baseline (Quetzal-1 Test Set)';

  const calculateHonestIntensity = (rawScore) => {
    if (rawScore >= 0) return 0;
    return Math.min((Math.abs(rawScore) / 0.2) * 100, 100).toFixed(1);
  };

  const downloadMissionDossier = () => {
    if (!data) return;
    const headers = ["Alarm_ID", "Timestamp", "Subsystem", "Primary_Cause", "Intensity_%", "Severity", "Recommended_Action"];
    const rows = data.anomalies_only.map((a, i) => {
      const intensity = calculateHonestIntensity(a.IF_Anomaly_Score);
      let severity = "LOW";
      let action = "Continue Monitoring";
      if (intensity > 80) { severity = "CRITICAL"; action = "Immediate System Reset"; }
      else if (intensity > 40) { severity = "MEDIUM"; action = "Manual Diagnostics Required"; }
      const primaryFeature = a.top_causes?.length > 0 ? a.top_causes[0].feature : 'Unknown';
      const subsystem = primaryFeature.includes('volt') || primaryFeature.includes('curr') || primaryFeature.includes('power') || primaryFeature.includes('capacity') ? 'Power (EPS)' :
                        primaryFeature.includes('gyro') ? 'Attitude (ADCS)' : 'Thermal (TCS)';
      return [`ALRM-${i + 1}`, a.timestamp, subsystem, primaryFeature, `${intensity}%`, severity, action];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STAR_PULSE_DOSSIER_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-page">
      <header className="report-header">
        <div className="header-titles">
          <h2>Mission Evaluation Report</h2>
          <p className="subtitle">STAR-Pulse Dual Ensemble: Global + Feature-Specific</p>
        </div>
        <div className="header-actions">
          <button className="download-btn" onClick={downloadMissionDossier}>DOWNLOAD DOSSIER (CSV)</button>
          <button className="print-btn" onClick={() => window.print()}>EXPORT PDF</button>
        </div>
      </header>

      <div className="report-container">

        {/* ROW 1: Session KPIs */}
        <div className="metrics-grid">
          <div className="metric-card">
            <h5>SESSION ALARMS</h5>
            <p>{data ? data.summary.flight_ready_anomalies : '--'}</p>
            <small>Combined Flags (Ensemble)</small>
          </div>
          <div className="metric-card">
            <h5>FRAMES PROCESSED</h5>
            <p>{data ? data.summary.total_rows.toLocaleString() : '--'}</p>
            <small>Rows in Uploaded File</small>
          </div>
          <div className="metric-card">
            <h5>THROUGHPUT</h5>
            <p>{perf.throughput ? `${perf.throughput.toLocaleString()} f/s` : '--'}</p>
            <small>Inference Speed</small>
          </div>
          <div className="metric-card">
            <h5>LATENCY</h5>
            <p>{perf.latency ? `${perf.latency}s` : '--'}</p>
            <small>End-to-End Processing Time</small>
          </div>
        </div>

        {/* ROW 2: Benchmark Upload + Evaluation Metrics */}
        <div className="analysis-row">
          <section className="report-card">
            <h3>Model Evaluation (Labelled Benchmark)</h3>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Upload a CSV/XLSX with the same telemetry columns plus a <code style={{ color: '#93c5fd' }}>ground_truth</code> column (0 = normal, 1 = anomaly) to compute supervised metrics.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', padding: '0.4rem 0.9rem', background: '#1e2330', border: '1px solid #2d3139', borderRadius: '4px', fontSize: '0.8rem', color: benchmarkFile ? '#60a5fa' : '#64748b' }}>
                {benchmarkFile ? benchmarkFile.name : 'Select Benchmark File'}
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => setBenchmarkFile(e.target.files[0])} />
              </label>
              <button
                onClick={handleBenchmarkUpload}
                disabled={!benchmarkFile || benchmarkUploading}
                style={{ padding: '0.4rem 0.9rem', background: '#1e3a5f', border: '1px solid #2563eb', borderRadius: '4px', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 600, cursor: benchmarkFile ? 'pointer' : 'not-allowed', opacity: benchmarkFile ? 1 : 0.5 }}
              >
                {benchmarkUploading ? 'Evaluating…' : 'Evaluate'}
              </button>
              {benchmark && (
                <button
                  onClick={() => { setBenchmark(null); localStorage.removeItem('starPulseBenchmark'); }}
                  style={{ padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #374151', borderRadius: '4px', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>
            {benchmarkError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.75rem' }}>{benchmarkError}</p>}
          </section>

          {benchmark ? (
            <section className="report-card">
              <h3>Evaluation Results</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
                Source: <span style={{ color: '#93c5fd' }}>{benchmark.filename}</span> &nbsp;·&nbsp; {benchmark.total_rows?.toLocaleString()} rows &nbsp;·&nbsp; {benchmark.anomaly_count} labelled anomalies
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'F1 Score',  value: benchmark.f1_score,  color: '#3b82f6' },
                  { label: 'Precision', value: benchmark.precision,  color: '#10b981' },
                  { label: 'Recall',    value: benchmark.recall,     color: '#f59e0b' },
                  { label: 'Accuracy',  value: benchmark.accuracy,   color: '#8b5cf6' },
                  ...(benchmark.auc_roc != null ? [{ label: 'AUC-ROC', value: benchmark.auc_roc, color: '#ec4899' }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#11141b', border: '1px solid #2d3139', borderRadius: '4px', padding: '0.75rem 1rem' }}>
                    <small style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</small>
                    <p style={{ color, fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0 0', fontFamily: 'monospace' }}>
                      {(value * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
              {benchmark.confusion_matrix && (
                <div>
                  <small style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confusion Matrix</small>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '0.5rem', maxWidth: '200px' }}>
                    {[
                      { label: 'TN', value: benchmark.confusion_matrix[0]?.[0], color: '#10b981' },
                      { label: 'FP', value: benchmark.confusion_matrix[0]?.[1], color: '#ef4444' },
                      { label: 'FN', value: benchmark.confusion_matrix[1]?.[0], color: '#f59e0b' },
                      { label: 'TP', value: benchmark.confusion_matrix[1]?.[1], color: '#3b82f6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: '#11141b', border: `1px solid ${color}33`, borderRadius: '4px', padding: '0.4rem', textAlign: 'center' }}>
                        <small style={{ color: '#64748b', fontSize: '0.65rem' }}>{label}</small>
                        <p style={{ color, fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>{value ?? '–'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="report-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center' }}>
                Upload a labelled benchmark file to see F1, precision, recall, AUC-ROC, and the confusion matrix.
              </p>
            </section>
          )}
        </div>

        {/* ROW 4: Training Baseline Stats + Feature Importance */}
        <div className="analysis-row">

          {trainMetrics && (
            <section className="report-card">
              <h3>Model Baseline (Quetzal-1 Test Set)</h3>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
                Trained on {trainMetrics.training_rows?.toLocaleString()} rows · Evaluated on {trainMetrics.test_rows?.toLocaleString()} rows (70/30 chronological split)
              </p>
              <table className="glossary-table">
                <thead>
                  <tr><th>Model</th><th>Flags</th><th>Flag Rate</th></tr>
                </thead>
                <tbody>
                  <tr><td>Isolation Forest</td><td>{trainMetrics.global_if_flags}</td><td>{trainMetrics.global_if_flag_rate}%</td></tr>
                  <tr><td>Local Outlier Factor</td><td>{trainMetrics.global_lof_flags}</td><td>{trainMetrics.global_lof_flag_rate}%</td></tr>
                  <tr><td>One-Class SVM</td><td>{trainMetrics.global_svm_flags}</td><td>{trainMetrics.global_svm_flag_rate}%</td></tr>
                </tbody>
              </table>
              <div className="formula-display" style={{ marginTop: '1rem' }}>
                Global Consensus (all 3 agree): {trainMetrics.global_consensus_count} ({trainMetrics.global_consensus_rate}%)
                &nbsp;·&nbsp;
                Feature Flags: {trainMetrics.feature_consensus_count} ({trainMetrics.feature_consensus_rate}%)
                &nbsp;·&nbsp;
                Combined: {trainMetrics.combined_anomaly_count} ({trainMetrics.combined_anomaly_rate}%)
              </div>
              <div className="formula-display">
                Global ↔ Feature Agreement Rate: {trainMetrics.agreement_rate}%
              </div>
            </section>
          )}

          <section className="report-card">
            <h3>Feature Anomaly Frequency</h3>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Source: {importanceSource}
            </p>
            {importanceData ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={importanceData} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={110} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ background: '#1a1e26', border: '1px solid #2d3139', fontSize: '12px' }}
                      formatter={(value) => [`${value} triggers`, 'Anomaly Count']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {importanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: '#475569', padding: '2rem 0', textAlign: 'center' }}>
                Upload a telemetry file to see session-specific feature anomaly counts.
              </p>
            )}
          </section>
        </div>

        {/* ROW 3: Methodology + Glossary */}
        <div className="analysis-row">
          <section className="report-card">
            <h3>Methodology Breakdown</h3>
            <div className="method-item">
              <strong>1. Dual Ensemble Architecture</strong>
              <p>Combines a Global Multivariate Ensemble (cross-channel correlations) with a Feature-Specific Ensemble (temporal drift per sensor) for maximum coverage.</p>
            </div>
            <div className="method-item">
              <strong>2. Committee Voting (IF + LOF + SVM)</strong>
              <p>Global alarm requires all 3 models to agree. Feature alarm requires ≥2 of 3 per feature, and ≥3 features to trigger simultaneously.</p>
            </div>
            <div className="method-item">
              <strong>3. Temporal Feature Engineering</strong>
              <p>Each sensor is enriched with 1st-order difference, 10-point rolling mean/std, and long-term drift (short 10pt vs long 50pt rolling mean).</p>
            </div>
            <div className="method-item">
              <strong>4. Chronological Train/Test Split</strong>
              <p>Models trained on first 70% of Quetzal-1 mission data (53,195 frames) and validated on the last 30% (22,799 frames) to prevent data leakage.</p>
            </div>
          </section>

          <section className="report-card">
            <h3>Engineered Feature Glossary</h3>
            <table className="glossary-table">
              <thead>
                <tr><th>Feature</th><th>Unit</th><th>Definition</th></tr>
              </thead>
              <tbody>
                <tr><td>diff</td><td>Δ/step</td><td>First-order difference between consecutive readings.</td></tr>
                <tr><td>roll_mean</td><td>–</td><td>10-point lagged rolling average (shift(1) to prevent leakage).</td></tr>
                <tr><td>roll_std</td><td>σ</td><td>10-point rolling standard deviation; captures short bursts of noise.</td></tr>
                <tr><td>drift</td><td>Δ</td><td>Short-term (10pt) minus long-term (50pt) rolling mean; captures gradual sensor drift.</td></tr>
                <tr><td>remaining_capacity</td><td>mAh</td><td>Real-time satellite energy buffer estimate.</td></tr>
                <tr><td>ADCS_temperature1</td><td>°C</td><td>Thermal probe near attitude determination hardware.</td></tr>
              </tbody>
            </table>
          </section>
        </div>

      </div>
    </div>
  );
};

export default Reports;
