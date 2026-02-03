import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h4>STAR-Pulse</h4>
          <p>Satellite Health Monitoring System</p>
        </div>
        
        <nav className="footer-nav">
          <Link to="/">Dashboard</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/logs">Mission Logs</Link>
          <Link to="/settings">System Settings</Link>
        </nav>

        <div className="footer-status">
          <span className="status-indicator"></span>
          <p>Downlink Active: 127.0.0.1:8000</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2026 STAR-Pulse. British Student-Lead Space Anomaly Detection Project.</p>
      </div>
    </footer>
  );
}