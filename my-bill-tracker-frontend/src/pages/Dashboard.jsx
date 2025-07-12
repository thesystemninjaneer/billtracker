//4. This page will display upcoming bills and recently paid bills. We'll use placeholder data for now.
import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Component-specific styles

function Dashboard() {
  // Placeholder data - this will come from API calls later
  const [upcomingBills, setUpcomingBills] = useState([
    { id: 1, organization: 'Power Company', amount: 120.50, dueDate: '2025-07-20' },
    { id: 2, organization: 'Water Utility', amount: 45.00, dueDate: '2025-07-25' },
    { id: 3, organization: 'Cable/Internet', amount: 80.00, dueDate: '2025-08-01' },
  ]);

  const [recentlyPaidBills, setRecentlyPaidBills] = useState([
    { id: 101, organization: 'Credit Card A', amount: 350.00, paidDate: '2025-07-05', confirmation: 'CCXYZ123' },
    { id: 102, organization: 'Rent', amount: 1500.00, paidDate: '2025-07-01', confirmation: 'RENTCONF99' },
  ]);

  // In a real app, you'd fetch data here:
  useEffect(() => {
    // fetchDataFromAPI();
  }, []);

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      <section className="dashboard-section upcoming-bills">
        <h3>📅 Upcoming Bills Due</h3>
        {upcomingBills.length === 0 ? (
          <p>No upcoming bills. You're all caught up!</p>
        ) : (
          <ul>
            {upcomingBills.map(bill => (
              <li key={bill.id} className="bill-item">
                <span className="bill-org">{bill.organization}</span> - ${bill.amount.toFixed(2)} - Due: {bill.dueDate}
                {/* Link to record payment for this bill */}
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