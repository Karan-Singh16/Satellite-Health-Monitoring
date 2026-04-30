// src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
import logoImg from '../assets/Logo.png';

const Navbar = () => {
  const navigate = useNavigate();
  const displayName = localStorage.getItem('starPulseDisplayName') || localStorage.getItem('starPulseUser');

  const links = [
    { path: '/dashboard', label: 'Home' },
    { path: '/telemetry', label: 'Telemetry' },
    { path: '/anomalies', label: 'Anomalies' },
    { path: '/reports', label: 'Reports' },
    { path: '/settings', label: 'Settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('starPulseToken');
    localStorage.removeItem('starPulseUser');
    localStorage.removeItem('starPulseDisplayName');
    localStorage.removeItem('starPulseResults');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-logo">
        <img src={logoImg} alt="STAR-Pulse Logo" className="logo-image" />
        <span className="navbar-title">STAR-Pulse</span>
      </Link>
      <div className="navbar-links">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <div className="navbar-user">
        {displayName && <span className="nav-username">{displayName}</span>}
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
