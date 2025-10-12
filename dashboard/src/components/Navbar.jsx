import React from "react";
import "./Navbar.css";

export default function Navbar() {
  console.log("Navbar rendered"); // temp check
  return (
    <nav className="navbar" aria-label="Primary">
      <div className="nav-inner">
        <div className="brand">STAR-Pulse</div>
        <ul className="links">
          <li><a href="/">Home</a></li>
          <li><a href="/telemetry">Telemetry</a></li>
          <li><a href="/anomalies">Anomalies</a></li>
          <li><a href="/alerts">Alerts</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </div>
    </nav>
  );
}
