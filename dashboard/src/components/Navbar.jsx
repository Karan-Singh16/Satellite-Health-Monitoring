// src/components/Navbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const links = [
    { path: '/', label: 'Home' },
    { path: '/telemetry', label: 'Telemetry' },
    { path: '/anomalies', label: 'Anomalies' },
    { path: '/alerts', label: 'Alerts' },
    { path: '/subsystems', label: 'Subsystems' },
    { path: '/reports', label: 'Reports' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">STAR-Pulse</div>
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
    </nav>
  );
};

export default Navbar;