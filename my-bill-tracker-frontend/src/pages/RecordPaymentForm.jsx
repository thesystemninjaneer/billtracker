//7. Form for recording details of a monthly bill payment.
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css';

function RecordPaymentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // Pre-fill organization from dashboard 'Record Payment' link
  const preselectedOrgId = queryParams.get('organizationId');
  const preselectedOrgName = queryParams.get('organizationName');

  const { authAxios } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [billsForOrg, setBillsForOrg] = useState([]); // Recurring bills for selected organization
  const [formData, setFormData] = useState({
    organizationId: preselectedOrgId || '',
    billId: '', // New: to link to a recurring bill entry
    dueDate: '',
    amountDue: '',
    datePaid: new Date().toISOString().split('T')[0], // Default to current date
    paymentConfirmationCode: '',
    amountPaid: '',
    notes: '',
  });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setError(null);

        // Fetch organizations
        const orgsResponse = await authAxios(config.ORGANIZATION_API_BASE_URL);
        if (!orgsResponse.ok) throw new Error('Failed to fetch organizations.');
        const orgsData = await orgsResponse.json();
        setOrganizations(orgsData);

        // If an organization is pre-selected, fetch its associated bills
        if (preselectedOrgId) {
          const foundOrg = orgsData.find(org => org.id.toString() === preselectedOrgId);
          if (foundOrg) {
            setFormData(prev => ({ ...prev, organizationId: foundOrg.id, organizationName: foundOrg.name }));
            // Fetch bills for this preselected organization
            const billsResponse = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills?organizationId=${foundOrg.id}`); // This endpoint doesn't exist yet, but for future filtering
            if (!billsResponse.ok) throw new Error('Failed to fetch bills for organization.');
            const billsData = await billsResponse.json();
            setBillsForOrg(billsData.filter(bill => bill.organizationId.toString() === foundOrg.id.toString()));
          }
        }

      } catch (err) {
        console.error("Failed to fetch data for payment form:", err);
        setError("Failed to load necessary data. Please ensure you are logged in and backend services are running.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [preselectedOrgId, authAxios]);

  // Effect to fetch bills when organizationId changes in the form
  useEffect(() => {
    const fetchBills = async () => {
      if (formData.organizationId) {
        try {
          // This fetches ALL bills for the user, then we filter by organizationId
          const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`);
          if (!response.ok) throw new Error('Failed to fetch recurring bills.');
          const data = await response.json();
          setBillsForOrg(data.filter(bill => bill.organizationId.toString() === formData.organizationId.toString()));
        } catch (err) {
          console.error("Failed to fetch bills for selected organization:", err);
          setBillsForOrg([]); // Clear bills if error
        }
      } else {
        setBillsForOrg([]); // Clear bills if no organization selected
      }
    };
    fetchBills();
  }, [formData.organizationId, authAxios]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If organization changes, reset billId
    if (name === "organizationId") {
        setFormData(prev => ({ ...prev, billId: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (isNaN(formData.amountDue) || parseFloat(formData.amountDue) < 0) {
        setError("Amount Due must be a valid non-negative number.");
        return;
    }
    if (isNaN(formData.amountPaid) || parseFloat(formData.amountPaid) < 0) {
        setError("Amount Paid must be a valid non-negative number.");
        return;
    }

    try {
      const payload = {
        organizationId: parseInt(formData.organizationId),
        billId: formData.billId ? parseInt(formData.billId) : null, // Send null if not selected
        dueDate: formData.dueDate,
        amountDue: parseFloat(formData.amountDue),
        datePaid: formData.datePaid,
        paymentConfirmationCode: formData.paymentConfirmationCode,
        amountPaid: parseFloat(formData.amountPaid),
        notes: formData.notes,
        // paymentStatus will be set by backend based on datePaid/amountPaid, or explicit
      };

      const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments`, {
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

      alert(`Payment recorded successfully!`);
      navigate('/'); // Go back to dashboard
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(`Failed to record payment: ${err.message}`);
    }
  };

  if (loadingData) {
    return <div className="form-container">Loading payment form data...</div>;
  }

  if (organizations.length === 0 && !loadingData) {
    return (
      <div className="form-container">
        <p className="info-message">
          You need to <Link to="/add-organization">add a billing organization</Link> before you can record payments.
        </p>
      </div>
    );
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
            disabled={!!preselectedOrgId} // Disable if pre-selected via URL
          >
            <option value="">Select an Organization</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          {preselectedOrgId && formData.organizationName && <p className="preselected-info">Selected: {formData.organizationName}</p>}
        </div>

        {formData.organizationId && billsForOrg.length > 0 && (
            <div className="form-group">
                <label htmlFor="billId">Link to Recurring Bill Entry (Optional):</label>
                <select
                    id="billId"
                    name="billId"
                    value={formData.billId}
                    onChange={handleChange}
                >
                    <option value="">Select a Bill Entry (e.g., Electricity)</option>
                    {billsForOrg.map(bill => (
                        <option key={bill.id} value={bill.id}>{bill.billName} (Due {bill.dueDay || 'N/A'})</option>
                    ))}
                </select>
            </div>
        )}
        {formData.organizationId && billsForOrg.length === 0 && (
            <p className="info-message">No recurring bill entries for this organization. Consider <Link to="/add-bill">adding one</Link>.</p>
        )}


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
        <div className="form-group">
          <label htmlFor="paymentConfirmationCode">Confirmation Code (Optional):</label>
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
          <label htmlFor="notes">Notes (Optional):</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        <button type="submit" className="btn-primary">Record Payment</button>
      </form>
    </div>
  );
}

export default RecordPaymentForm;