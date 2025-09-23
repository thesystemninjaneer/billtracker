// my-bill-tracker-frontend/src/components/Header.jsx
//3. A simple navigation header to move between sections.
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <nav>
        <Link to="/" className="app-title">💰 Bill Tracker</Link>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/add-organization">Add Org</Link>
              <Link to="/add-bill">Add Bill</Link>
              <Link to="/edit-bills">Edit Bills</Link> {/* ADD THIS LINK */}
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
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
