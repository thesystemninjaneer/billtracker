import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css'; // Component-specific styles

function Header() {
  return (
    <header className="header">
      <nav>
        <Link to="/" className="app-title">💰 Bill Tracker</Link>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/add-organization">Add Organization</Link>
          <Link to="/record-payment">Record Payment</Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;

.header {
  background-color: #282c34;
  color: white;
  padding: 15px 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.header nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto;
}

.header .app-title {
  color: white;
  text-decoration: none;
  font-size: 1.5em;
  font-weight: bold;
}

.header .nav-links a {
  color: #a0a0a0;
  text-decoration: none;
  margin-left: 20px;
  font-size: 1.1em;
  transition: color 0.3s ease;
}

.header .nav-links a:hover {
  color: #61dafb; /* React blue */
}