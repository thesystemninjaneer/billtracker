// my-bill-tracker-frontend/src/components/Header.jsx
import React from 'react';
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./Header.css";

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <nav>
        <div className="nav-left">
          <Link to="/" className="app-title">💰 Bill Tracker</Link>
        </div>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/organizations">Orgs</Link>
              <Link to="/bills">Bills</Link>
              <Link to="/record-payment">Record Payment</Link>
              <span className="user-info">Hello, {user?.username}!</span>
              <Link to="/settings">Settings</Link>
              <button onClick={logout} className="logout-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
