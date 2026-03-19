import React from "react";
import "./Sign-Up.css";

function SignUp() {
    return(
        <div className="Signup-container">
            <img src="/src/assets/Logo.png" alt="STAR-Pulse Logo" className="Signup-logo" />
            <h2>Sign up</h2>
            <form className="login-form">
                <label htmlFor="username">Username:</label>
                <input type="text" id="username" name="username" required />
                <label htmlFor="password">Password:</label>
                <input type="password" id="password" name="password" required />
                <label htmlFor="confirm-password">Confirm-Password:</label>
                <input type="confirm password" id="confirm password" name="confirm password" required />
                <button type="submit">Sign up</button>
            </form>
        </div>

    );

}

export default SignUp;