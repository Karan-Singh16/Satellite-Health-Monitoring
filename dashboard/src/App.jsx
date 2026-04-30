// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Telemetry from './pages/Telemetry';
import Anomalies from './pages/Anomalies';
import Reports from './pages/Reports';
import Footer from './components/Footer';
import Login from './pages/Login';
import SignUp from './pages/Sign-Up';
import SplashScreen from './pages/SplashScreen';
import Settings from './pages/Settings';

const isAuthenticated = () => !!localStorage.getItem('starPulseToken');

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const hideUI = ['/', '/login', '/register'].includes(location.pathname);

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
          {/* Public routes */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />

          {/* Protected dashboard routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/telemetry" element={<ProtectedRoute><Telemetry /></ProtectedRoute>} />
          <Route path="/anomalies" element={<ProtectedRoute><Anomalies /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LayoutWrapper>
    </Router>
  );
}

export default App;
