// my-bill-tracker-frontend/src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./Header.css";

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [version, setVersion] = useState(null);

  useEffect(() => {
    async function getVersion() {
      try {
        const res = await fetch("/api/version");
        const data = await res.json();
        setVersion(data.version);
      } catch (err) {
        console.error("Version fetch failed:", err);
        setVersion("N/A");
      }
    }
    getVersion();
  }, []);

  return (
    <header className="header">
      <nav>
        <Link to="/" className="app-title">💰 Bill Tracker</Link>

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

      {/* ✅ Version display always visible */}
      <div className="app-version">
        <small>
          {version ? `v${version.replace(/^v/, "")}` : "Loading version..."}
        </small>
      </div>
    </header>
  );
}

export default Header;
