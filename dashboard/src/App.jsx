// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Telemetry from './pages/Telemetry';
import Anomalies from './pages/Anomalies';
import Reports from './pages/Reports'; // Added back
import Footer from './components/Footer';
import Login from './pages/Login';
import SplashScreen from './pages/SplashScreen';

// This helper component hides the Navbar/Footer on specific pages
const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  
  // Hide UI elements on Splash (/) and Login (/login)
  // Note: Your dashboard is now at /dashboard, so we keep UI hidden for the landing pages
  const hideUI = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="app-container">
      {!hideUI && <Navbar />}
      <main className="content-area">
        {children}
      </main>
      {!hideUI && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <LayoutWrapper>
        <Routes>
          {/* Landing / Entry Routes (UI Hidden) */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />
          
          {/* Main Dashboard Routes (UI Visible) */}
          <Route path="/dashboard" element={<Home />} />
          <Route path="/telemetry" element={<Telemetry />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/reports" element={<Reports />} />
          
          {/* You can add a /settings route here later */}
        </Routes>
      </LayoutWrapper>
    </Router>
  );
}

export default App;