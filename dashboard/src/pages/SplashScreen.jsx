import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/Logo2.png';
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login'), 3500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-container">
      <div className="splash-grid" />
      <div className="splash-glow" />

      <div className="splash-content">
        <img src={Logo} alt="STAR-Pulse Logo" className="splash-logo" />

        <div className="splash-title-block">
          <h1 className="splash-title">STAR-PULSE</h1>
          <p className="splash-subtitle">Satellite Telemetry Analysis &amp; Reporting Platform</p>
        </div>

        <div className="splash-status">
          <span className="splash-dot" />
          <span className="splash-status-text">INITIALISING SYSTEMS</span>
        </div>

        <div className="splash-progress-track">
          <div className="splash-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
