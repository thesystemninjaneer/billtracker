//3. A simple navigation header to move between sections.
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="header">
      <nav>
        <Link to="/" className="app-title">💰 Bill Tracker</Link>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/add-organization">Add Org</Link>
              <Link to="/add-bill">Add Bill</Link> {/* New link */}
              <Link to="/record-payment">Record Payment</Link>
              <Link to="/settings">Settings</Link>
              <span className="user-info">Hello, {user?.username}!</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;