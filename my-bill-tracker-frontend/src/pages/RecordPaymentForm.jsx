//7. Form for recording details of a monthly bill payment.
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import config from '../config'; // Import the config
import './Forms.css'; // Shared styles for forms

function RecordPaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preselectedOrgId = queryParams.get('organizationId');
  const preselectedOrgName = queryParams.get('organizationName');
  const preselectedAmount = queryParams.get('amount'); // If coming from upcoming bills

  const [organizations, setOrganizations] = useState([]);
  const [formData, setFormData] = useState({
    organizationId: preselectedOrgId || '',
    organizationName: preselectedOrgName || '', // Storing name for display
    dueDate: '',
    amountDue: preselectedAmount || '',
    datePaid: new Date().toISOString().split('T')[0], // Default to current date
    paymentConfirmationCode: '',
    amountPaid: preselectedAmount || '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // If an organization was pre-selected by ID, ensure its name is also set
        if (preselectedOrgId && data.length > 0) {
          const foundOrg = data.find(org => org.id.toString() === preselectedOrgId);
          if (foundOrg) {
            setFormData(prev => ({
              ...prev,
              organizationName: foundOrg.name,
              organizationId: foundOrg.id, // Ensure ID is correct type/value
            }));
          }
        } else if (preselectedOrgName && data.length > 0) { // Fallback for name if no ID
             const foundOrg = data.find(org => org.name === preselectedOrgName);
             if (foundOrg) {
                 setFormData(prev => ({
                     ...prev,
                     organizationId: foundOrg.id,
                 }));
             }
        }


      } catch (err) {
        console.error("Failed to fetch organizations for dropdown:", err);
        setError("Failed to load organizations for payment selection. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [preselectedOrgId, preselectedOrgName]); // Re-run if query params change

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "organizationId") {
      const selectedOrg = organizations.find(org => org.id.toString() === value);
      setFormData(prev => ({
        ...prev,
        organizationId: value,
        organizationName: selectedOrg ? selectedOrg.name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // In the future, this will go to the Bill Payment Service
    const paymentData = {
      organizationId: formData.organizationId,
      // We don't need to send organizationName to the backend, it knows by ID
      dueDate: formData.dueDate,
      amountDue: parseFloat(formData.amountDue),
      datePaid: formData.datePaid,
      paymentConfirmationCode: formData.paymentConfirmationCode,
      amountPaid: parseFloat(formData.amountPaid),
    };

    console.log('Simulating recording payment:', paymentData);
    alert(`Payment recorded for ${formData.organizationName}! (Simulated)`);
    navigate('/'); // Go back to dashboard after submission
    // Actual API call would look like this:
    /*
    try {
      const response = await fetch(config.BILL_PAYMENT_API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment.');
      }
      alert(`Payment recorded for ${formData.organizationName} successfully!`);
      navigate('/');
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(`Failed to record payment: ${err.message}`);
    }
    */
  };

  if (loading) {
    return <div className="form-container">Loading organizations for payment form...</div>;
  }

  return (
    <div className="form-container">
      <h2>Record Monthly Bill Payment</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="organizationId">Billing Organization:</label>
          <select
            id="organizationId"
            name="organizationId"
            value={formData.organizationId}
            onChange={handleChange}
            required
            disabled={!!preselectedOrgId} // Disable if pre-selected
          >
            <option value="">Select an Organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          {preselectedOrgId && <p className="preselected-info">Selected: {formData.organizationName}</p>}
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