import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css'; // Re-use existing form styles

function AddBillForm() {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [formData, setFormData] = useState({
    organizationId: '',
    billName: '',
    dueDay: '',
    typicalAmount: '',
    frequency: 'monthly', // Default frequency
    notes: '',
  });
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoadingOrgs(true);
        setError(null);
        // Fetch organizations to populate the dropdown
        const response = await authAxios(config.ORGANIZATION_API_BASE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setOrganizations(data);
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
        setError("Failed to load organizations for bill entry. Please try again.");
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, [authAxios]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation for numbers
    if (formData.dueDay && (isNaN(formData.dueDay) || formData.dueDay < 1 || formData.dueDay > 31)) {
        setError("Due Day must be a number between 1 and 31.");
        return;
    }
    if (formData.typicalAmount && isNaN(formData.typicalAmount)) {
        setError("Typical Amount must be a valid number.");
        return;
    }

    try {
      const payload = {
        ...formData,
        organizationId: parseInt(formData.organizationId), // Ensure ID is integer
        dueDay: formData.dueDay ? parseInt(formData.dueDay) : null,
        typicalAmount: formData.typicalAmount ? parseFloat(formData.typicalAmount) : null,
      };

      const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      alert('Bill entry added successfully!');
      navigate('/'); // Go back to dashboard
    } catch (err) {
      console.error('Error adding bill entry:', err);
      setError(`Failed to add bill entry: ${err.message}`);
    }
  };

  if (loadingOrgs) {
    return <div className="form-container">Loading organizations...</div>;
  }

  if (organizations.length === 0 && !loadingOrgs) {
    return (
      <div className="form-container">
        <p className="info-message">
          You need to <Link to="/add-organization">add a billing organization</Link> before you can add a bill entry.
        </p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Add New Recurring Bill</h2>
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
          >
            <option value="">Select an Organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="billName">Bill Name (e.g., Electricity, Internet):</label>
          <input
            type="text"
            id="billName"
            name="billName"
            value={formData.billName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="dueDay">Typical Due Day of Month (1-31, Optional):</label>
          <input
            type="number"
            id="dueDay"
            name="dueDay"
            value={formData.dueDay}
            onChange={handleChange}
            min="1"
            max="31"
          />
        </div>
        <div className="form-group">
          <label htmlFor="typicalAmount">Typical Amount ($):</label>
          <input
            type="number"
            id="typicalAmount"
            name="typicalAmount"
            value={formData.typicalAmount}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label htmlFor="frequency">Frequency:</label>
          <select
            id="frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
            <option value="weekly">Weekly</option>
            <option value="one-time">One-Time</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="notes">Notes (Optional):</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        <button type="submit" className="btn-primary">Add Bill Entry</button>
      </form>
    </div>
  );
}

export default AddBillForm;