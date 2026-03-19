import React from "react";
import { useNavigate } from "react-router-dom"; // Import for redirection
import logoImg from "../assets/Logo.png"; // Import logo correctly
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault(); // Stop the page from reloading
    
    // In a real app, you would validate credentials here.
    // For now, we simulate a successful login by redirecting to the dashboard.
    console.log("Login successful! Redirecting...");
    navigate("/dashboard"); 
  };

  return (
    <div className="login-container">
      <h1 className="title">Welcome to STAR-Pulse</h1>
      
      {/* Updated logo usage */}
      <img src={logoImg} alt="STAR-Pulse Logo" className="login-logo" />
      
      <h2>Login</h2>
      
      {/* Changed action to onSubmit handler */}
      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="username">Username:</label>
        <input type="text" id="username" name="username" required />
        
        <label htmlFor="password">Password:</label>
        <input type="password" id="password" name="password" required />
        
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;