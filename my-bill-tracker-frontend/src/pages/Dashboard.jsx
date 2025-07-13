import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import config from '../config';
import './Dashboard.css';

function Dashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [recentlyPaidBills, setRecentlyPaidBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authAxios } = useAuth(); // Get authAxios from context

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Organizations
        const orgsResponse = await authAxios(config.ORGANIZATION_API_BASE_URL);
        if (!orgsResponse.ok) throw new Error('Failed to fetch organizations.');
        const orgsData = await orgsResponse.json();
        setOrganizations(orgsData);

        // Fetch Upcoming Bills
        const upcomingResponse = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/upcoming`);
        if (!upcomingResponse.ok) throw new Error('Failed to fetch upcoming bills.');
        const upcomingData = await upcomingResponse.json();
        setUpcomingBills(upcomingData);

        // Fetch Recently Paid Bills
        const paidResponse = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/recently-paid`);
        if (!paidResponse.ok) throw new Error('Failed to fetch recently paid bills.');
        const paidData = await paidResponse.json();
        setRecentlyPaidBills(paidData);

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please ensure you are logged in and all backend services are running.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authAxios]); // Dependency array includes authAxios

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
                  {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="action-link website-link">Visit Website</a>}
                  <Link to={`/edit-organization/${org.id}`} className="action-link edit-link">Edit</Link>
                  <Link to={`/record-payment?organizationId=${org.id}&organizationName=${org.name}`} className="action-link record-link">Record Payment</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section upcoming-bills">
        <h3>📅 Upcoming Bills Due</h3>
        {upcomingBills.length === 0 ? (
          <p>No upcoming bills to display yet. Record a payment or add new bills!</p>
        ) : (
          <ul>
            {upcomingBills.map(bill => (
              <li key={bill.id} className="bill-item upcoming-item">
                <span className="bill-org">{bill.organizationName}</span>
                {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                <span> - {formatCurrency(bill.amountDue)}</span>
                <span className="due-date"> - Due: {formatDate(bill.dueDate)}</span>
                <Link to={`/record-payment?organizationId=${bill.organizationId}&organizationName=${bill.organizationName}&billId=${bill.billId}&amountDue=${bill.amountDue}&dueDate=${bill.dueDate}`} className="action-link record-link">Record Payment</Link>
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
                <span className="bill-org">{bill.organizationName}</span>
                {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                <span> - Paid: {formatCurrency(bill.amountPaid)}</span>
                <span className="paid-date"> on {formatDate(bill.datePaid)}</span>
                {bill.confirmationCode && <span className="confirmation-code"> (Conf: {bill.confirmationCode})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;