import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config'; // Import the config
import './Dashboard.css'; // Component-specific styles

function Dashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Placeholder data for upcoming/recently paid bills (will be from Bill Payment Service later)
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [recentlyPaidBills, setRecentlyPaidBills] = useState([]);


  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(config.ORGANIZATION_API_BASE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setOrganizations(data);
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
        setError("Failed to load organizations. Please ensure the backend service is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
    // In the future, fetch upcomingBills and recentlyPaidBills from BillPaymentService here
    // fetchUpcomingBills();
    // fetchRecentlyPaidBills();
  }, []);

  if (loading) {
    return <div className="dashboard-container">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {error && <p className="error-message">{error}</p>}

      <section className="dashboard-section bill-organizations">
        <h3>🏠 Your Bill Organizations</h3>
        {organizations.length === 0 ? (
          <p>No billing organizations added yet. <Link to="/add-organization">Add one now!</Link></p>
        ) : (
          <ul>
            {organizations.map(org => (
              <li key={org.id} className="bill-item">
                <span className="bill-org">{org.name}</span>
                <span>Account: {org.accountNumber}</span>
                <span>Due Day: {org.typicalDueDay || 'N/A'}</span>
                <div className="item-actions">
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="action-link website-link">Visit Website</a>
                  <Link to={`/edit-organization/${org.id}`} className="action-link edit-link">Edit</Link>
                  {/* Link to record payment for this organization (will refine later) */}
                  <Link to={`/record-payment?organizationId=${org.id}&organizationName=${org.name}`} className="action-link record-link">Record Payment</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Placeholder for Upcoming and Recently Paid Bills - will be populated by Bill Payment Service */}
      <section className="dashboard-section upcoming-bills">
        <h3>📅 Upcoming Bills Due</h3>
        {upcomingBills.length === 0 ? (
          <p>No upcoming bills to display yet. Record a payment or add new bills!</p>
        ) : (
          <ul>
            {upcomingBills.map(bill => (
              <li key={bill.id} className="bill-item">
                <span className="bill-org">{bill.organization}</span> - ${bill.amount.toFixed(2)} - Due: {bill.dueDate}
                <Link to={`/record-payment?organization=${bill.organization}&amount=${bill.amount}`} className="record-link">Record Payment</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section recently-paid">
        <h3>✅ Recently Paid Bills</h3>
        {recentlyPaidBills.length === 0 ? (
          <p>No recently paid bills.</p>
        ) : (
          <ul>
            {recentlyPaidBills.map(bill => (
              <li key={bill.id} className="bill-item paid-item">
                <span className="bill-org">{bill.organization}</span> - Paid: ${bill.amount.toFixed(2)} on {bill.paidDate}
                {bill.confirmation && <span className="confirmation-code"> (Conf: {bill.confirmation})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;