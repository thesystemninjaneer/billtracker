import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Forms.css'; // Shared styles for forms

function RecordPaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedOrgName = queryParams.get('organization');
  const preselectedAmount = queryParams.get('amount');

  const [formData, setFormData] = useState({
    organization: preselectedOrgName || '', // Can be pre-filled from Dashboard link
    dueDate: '',
    amountDue: preselectedAmount || '',
    datePaid: new Date().toISOString().split('T')[0], // Default to current date
    paymentConfirmationCode: '',
    amountPaid: preselectedAmount || '',
  });

  // Placeholder for organizations to select from - will be fetched from API
  const [organizations, setOrganizations] = useState([
    { id: 1, name: 'Power Company' },
    { id: 2, name: 'Water Utility' },
    { id: 3, name: 'Cable/Internet' },
    { id: 4, name: 'Credit Card A' },
    { id: 5, name: 'Rent' },
  ]);

  useEffect(() => {
    // In a real app, fetch available organizations from the Organization Service API here
    // fetchOrganizations().then(data => setOrganizations(data));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Recording payment:', formData);
    // Call API to record the payment
    alert(`Payment recorded for ${formData.organization}!`);
    navigate('/'); // Go back to dashboard after submission
  };

  return (
    <div className="form-container">
      <h2>Record Monthly Bill Payment</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="organization">Billing Organization:</label>
          <select
            id="organization"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
          >
            <option value="">Select an Organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.name}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="dueDate">Bill Due Date:</label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amountDue">Amount Due ($):</label>
          <input
            type="number"
            id="amountDue"
            name="amountDue"
            value={formData.amountDue}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="datePaid">Date Paid:</label>
          <input
            type="date"
            id="datePaid"
            name="datePaid"
            value={formData.datePaid}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="paymentConfirmationCode">Confirmation Code:</label>
          <input
            type="text"
            id="paymentConfirmationCode"
            name="paymentConfirmationCode"
            value={formData.paymentConfirmationCode}
            onChange={handleChange}
            placeholder="e.g., 1A2B3C4D"
          />
        </div>
        <div className="form-group">
          <label htmlFor="amountPaid">Amount Paid ($):</label>
          <input
            type="number"
            id="amountPaid"
            name="amountPaid"
            value={formData.amountPaid}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>
        <button type="submit" className="btn-primary">Record Payment</button>
      </form>
    </div>
  );
}

export default RecordPaymentForm;