import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import config from '../config';
import './Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';

function Dashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [recentlyPaidBills, setRecentlyPaidBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, authAxios } = useAuth(); // Get authAxios from context

  // State for managing the pagination limits for each section
  const [organizationsLimit, setOrganizationsLimit] = useState(10);
  const [upcomingBillsLimit, setUpcomingBillsLimit] = useState(10);
  const [paidBillsLimit, setPaidBillsLimit] = useState(10);

  // State for managing the collapse/expand feature
  const [isOrganizationsCollapsed, setIsOrganizationsCollapsed] = useState(true);
  const [isUpcomingBillsCollapsed, setIsUpcomingBillsCollapsed] = useState(false); // Expanded by default
  const [isRecentlyPaidCollapsed, setIsRecentlyPaidCollapsed] = useState(true);
  
  useEffect(() => {
      const fetchData = async () => {
          if (!user) return; // Don't fetch if user is not logged in

          try {
              setLoading(true);
              setError(null);

              // Fetch all Organizations
              const orgsResponse = await authAxios.get(config.ORGANIZATION_API_BASE_URL);
              setOrganizations(orgsResponse.data);

              // Fetch all Upcoming Bills
              const upcomingResponse = await authAxios.get(`${config.BILL_PAYMENT_API_BASE_URL}/payments/upcoming`);
              setUpcomingBills(upcomingResponse.data);

              // Fetch all Recently Paid Bills
              const paidResponse = await authAxios.get(`${config.BILL_PAYMENT_API_BASE_URL}/payments/recently-paid`);
              setRecentlyPaidBills(paidResponse.data);

          } catch (err) {
              console.error("Failed to fetch dashboard data:", err);
              setError("Failed to load dashboard data. Please ensure you are logged in and all backend services are running.");
          } finally {
              setLoading(false);
          }
      };

      fetchData();
  }, [authAxios, user]);

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
  
  const formatPaidDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
      });
  };

  // Get the data to display based on the current limits
  const organizationsToShow = organizations.slice(0, organizationsLimit);
  const hasMoreOrganizations = organizations.length > organizationsLimit;

  const upcomingBillsToShow = upcomingBills.slice(0, upcomingBillsLimit);
  const hasMoreUpcomingBills = upcomingBills.length > upcomingBillsLimit;

  const recentlyPaidBillsToShow = recentlyPaidBills.slice(0, paidBillsLimit);
  const hasMorePaidBills = recentlyPaidBills.length > paidBillsLimit;

  if (loading) {
      return <div className="dashboard-container">Loading dashboard...</div>;
  }

  if (!user) {
      return <div className="dashboard-container">Please log in to view your dashboard.</div>;
  }

  return (
      <div className="dashboard-container">
          <h2>Dashboard</h2>
          {error && <p className="error-message">{error}</p>}
          
          {/* Collapsible Section: Upcoming Bills Due */}
          <section className="dashboard-section upcoming-bills">
              <h3 onClick={() => setIsUpcomingBillsCollapsed(!isUpcomingBillsCollapsed)} className="collapsible-header">
                  <FontAwesomeIcon icon={isUpcomingBillsCollapsed ? faChevronRight : faChevronDown} className="chevron-icon" />
                  📅 Upcoming Bills Due
              </h3>
              {!isUpcomingBillsCollapsed && (
                  <div className="collapsible-content">
                      {upcomingBillsToShow.length === 0 ? (
                          <p>No upcoming bills to display yet. Record a payment or add new bills!</p>
                      ) : (
                          <ul>
                              {upcomingBillsToShow.map(bill => (
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
                      {hasMoreUpcomingBills && (
                          <button
                              onClick={() => setUpcomingBillsLimit(upcomingBillsLimit + 10)}
                              className="load-more-btn"
                          >
                              Load more...
                          </button>
                      )}
                  </div>
              )}
          </section>
          
          {/* Collapsible Section: Your Bill Organizations */}
          <section className="dashboard-section bill-organizations">
              <h3 onClick={() => setIsOrganizationsCollapsed(!isOrganizationsCollapsed)} className="collapsible-header">
                  <FontAwesomeIcon icon={isOrganizationsCollapsed ? faChevronRight : faChevronDown} className="chevron-icon" />
                  🏠 Your Bill Organizations
              </h3>
              {!isOrganizationsCollapsed && (
                  <div className="collapsible-content">
                      {organizationsToShow.length === 0 ? (
                          <p>No billing organizations added yet. <Link to="/add-organization">Add one now!</Link></p>
                      ) : (
                          <ul>
                              {organizationsToShow.map(org => (
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
                      {hasMoreOrganizations && (
                          <button
                              onClick={() => setOrganizationsLimit(organizationsLimit + 10)}
                              className="load-more-btn"
                          >
                              Load more...
                          </button>
                      )}
                  </div>
              )}
          </section>

          {/* Collapsible Section: Recently Paid Bills */}
          <section className="dashboard-section recently-paid">
              <h3 onClick={() => setIsRecentlyPaidCollapsed(!isRecentlyPaidCollapsed)} className="collapsible-header">
                  <FontAwesomeIcon icon={isRecentlyPaidCollapsed ? faChevronRight : faChevronDown} className="chevron-icon" />
                  ✅ Recently Paid Bills
              </h3>
              {!isRecentlyPaidCollapsed && (
                  <div className="collapsible-content">
                      {recentlyPaidBillsToShow.length === 0 ? (
                          <p>No recently paid bills.</p>
                      ) : (
                          <ul>
                              {recentlyPaidBillsToShow.map(bill => (
                                  <li key={bill.id} className="bill-item paid-item">
                                      <span className="bill-org">{bill.organizationName}</span>
                                      {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                                      <span> - Paid: {formatCurrency(bill.amountPaid)}</span>
                                      <span className="paid-date"> on {formatPaidDate(bill.datePaid)}</span>
                                      {bill.confirmationCode && <span className="confirmation-code"> (Conf: {bill.confirmationCode})</span>}
                                  </li>
                              ))}
                          </ul>
                      )}
                      {hasMorePaidBills && (
                          <button
                              onClick={() => setPaidBillsLimit(paidBillsLimit + 10)}
                              className="load-more-btn"
                          >
                              Load more...
                          </button>
                      )}
                  </div>
              )}
          </section>
      </div>
  );
}

export default Dashboard;
