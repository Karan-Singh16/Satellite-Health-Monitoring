// src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';
import logoImg from '../assets/LogoC.png';

const Navbar = () => {
  const links = [
    { path: '/', label: 'Home' },
    { path: '/telemetry', label: 'Telemetry' },
    { path: '/anomalies', label: 'Anomalies' },
    { path: '/reports', label: 'Reports' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
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
    </nav>
  );
};

export default Navbar;