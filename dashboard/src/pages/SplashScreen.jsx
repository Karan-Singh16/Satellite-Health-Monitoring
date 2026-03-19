import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '/src/assets/Logo2.png'; // Ensure your logo is in assets
import './SplashScreen.css';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirects to the login page after 2.7 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 2700);

    // Cleanup timer if user leaves page before it finishes
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-container">
      <img src={Logo} alt="Logo" className="logo" />
    </div>
  );
};

export default SplashScreen;