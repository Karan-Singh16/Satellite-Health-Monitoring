// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Telemetry from './pages/Telemetry';
import Anomalies from './pages/Anomalies';

// Remaining placeholders
const Alerts = () => <div style={{ padding: '2rem', color: '#fff' }}>Alert Management Placeholder</div>;
const Subsystems = () => <div style={{ padding: '2rem', color: '#fff' }}>Subsystem Health Placeholder</div>;
const Reports = () => <div style={{ padding: '2rem', color: '#fff' }}>Mission Reports Placeholder</div>;
const Settings = () => <div style={{ padding: '2rem', color: '#fff' }}>System Settings Placeholder</div>;

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/telemetry" element={<Telemetry />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/subsystems" element={<Subsystems />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;