//8. A simple page for routes that don't exist.
import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  return (
    <div className="not-found-container">
      <h1>404 - Page Not Found</h1>
      <p>Oops! The page you're looking for doesn't exist.</p>
      <Link to="/" className="home-link">Go to Dashboard</Link>
    </div>
  );
}

export default NotFound;