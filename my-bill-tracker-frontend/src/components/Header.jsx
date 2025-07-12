//3. A simple navigation header to move between sections.
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