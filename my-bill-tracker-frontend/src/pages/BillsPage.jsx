// my-bill-tracker-frontend/src/pages/BillsPage.jsx
// Part 1: Imports & State Setup
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css';
import './Dashboard.css';

function BillsPage() {
  const { id: editId } = useParams(); // Used for editing mode
  const navigate = useNavigate();
  const { authAxios } = useAuth();

  const [bills, setBills] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    organizationId: '',
    billName: '',
    dueDay: '',
    typicalAmount: '',
    frequency: 'monthly',
    notes: '',
    isActive: true
  });

  const [showInactive, setShowInactive] = useState(false);

    // Load all orgs
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}?limit=1000`);
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        console.error("Failed to load organizations", err);
      }
    };
    fetchOrganizations();
  }, [authAxios]);

  // Part 2: Fetch Orgs, Bills & Bill by ID
  // Load all bills
  const fetchBills = async () => {
    try {
      setLoading(true);
      const query = showInactive ? '?includeInactive=true' : '';
      const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills${query}`);
      const data = await response.json();
      setBills(data || []);
    } catch (err) {
      console.error("Failed to load bills", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(showInactive);
  }, [authAxios, showInactive]);


  // If in edit mode, fetch that bill’s data
  useEffect(() => {
    if (editId) {
      const fetchBill = async () => {
        try {
          const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills/${editId}`);
          if (!response.ok) throw new Error('Failed to fetch bill for editing.');
          const data = await response.json();
          setFormData({
            organizationId: data.organizationId || '',
            billName: data.billName || '',
            dueDay: data.dueDay || '',
            typicalAmount: data.typicalAmount || '',
            frequency: data.frequency || 'monthly',
            notes: data.notes || '',
            isActive: data.isActive !== 0, // safely convert 0/1 to boolean
         });
          setIsFormVisible(true);
          setIsEditing(true);
        } catch (err) {
          console.error("Error loading bill:", err);
          setFormError('Unable to load bill for editing.');
        }
      };
      fetchBill();
    }
  }, [editId, authAxios]);

  // Part 3 form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (formData.dueDay && (isNaN(formData.dueDay) || formData.dueDay < 1 || formData.dueDay > 31)) {
      setFormError("Due Day must be a number between 1 and 31.");
      return;
    }
    if (formData.typicalAmount && isNaN(formData.typicalAmount)) {
      setFormError("Typical Amount must be a valid number.");
      return;
    }

    const payload = {
      ...formData,
      organizationId: parseInt(formData.organizationId),
      dueDay: formData.dueDay ? parseInt(formData.dueDay) : null,
      typicalAmount: formData.typicalAmount ? parseFloat(formData.typicalAmount) : null,
      ...(isEditing && { isActive: formData.isActive ? 1 : 0 }) // Only include when editing
    };

    try {
      const url = isEditing
        ? `${config.BILL_PAYMENT_API_BASE_URL}/bills/${editId}`
        : `${config.BILL_PAYMENT_API_BASE_URL}/bills`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await authAxios(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save bill.');
      }

      alert(`Bill ${isEditing ? 'updated' : 'added'} successfully!`);
      navigate('/bills');
      fetchBills();
      setIsFormVisible(false);
      setIsEditing(false);
    } catch (err) {
      console.error("Submit error:", err);
      setFormError(err.message);
    }
  };

  // Part 4 UI (Form + List)
   const showAddForm = () => {
    setFormData({
      organizationId: '',
      billName: '',
      dueDay: '',
      typicalAmount: '',
      frequency: 'monthly',
      notes: '',
    });
    setIsFormVisible(true);
    setIsEditing(false);
  };

  const cancelForm = () => {
    setIsFormVisible(false);
    if (isEditing) navigate('/bills');
  };

  return (
    <div className="dashboard-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Recurring Bills</h2>
        {!isFormVisible && (
          <button onClick={showAddForm} className="action-link website-link">Add New Bill</button>
        )}
      </div>

      {isFormVisible && (
        <div className="form-container">
          <h3 className="text-2xl mb-4">{isEditing ? 'Edit Bill' : 'Add New Bill'}</h3>
          {formError && <p className="error-message">{formError}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Billing Organization:</label>
              <select name="organizationId" value={formData.organizationId} onChange={handleChange} required>
                <option value="">Select an Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group"><label>Bill Name:</label><input type="text" name="billName" value={formData.billName} onChange={handleChange} required /></div>
            <div className="form-group"><label>Due Day (1-31):</label><input type="number" name="dueDay" value={formData.dueDay} onChange={handleChange} min="1" max="31" /></div>
            <div className="form-group"><label>Typical Amount ($):</label><input type="number" name="typicalAmount" value={formData.typicalAmount} onChange={handleChange} step="0.01" /></div>
            <div className="form-group">
              <label>Frequency:</label>
              <select name="frequency" value={formData.frequency} onChange={handleChange}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="weekly">Weekly</option>
                <option value="one-time">One-Time</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>Notes:</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" /></div>
            {isEditing && (
            <div className="form-group">
                <label>
                <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                />
                {' '}This recurring bill is active
                </label>
            </div>
            )}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={cancelForm}>Cancel</button>
              <button type="submit" className="btn-primary">{isEditing ? 'Update Bill' : 'Add Bill'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>
            <input
            type="checkbox"
            checked={showInactive}
            onChange={() => setShowInactive(prev => !prev)}
            />
            {' '}Show Inactive Bills
        </label>
      </div>


      {!isFormVisible && (
        <section className="dashboard-section">
          {loading ? (
            <p>Loading bills...</p>
          ) : bills.length === 0 ? (
            <p>No recurring bills yet. <button onClick={showAddForm} className="action-link">Add one now</button>.</p>
          ) : (
            <ul>
              {bills.map(bill => (
                <li key={bill.id} className="bill-item">
                    <div>
                    <span className="bill-org">{bill.organizationName}</span>
                    {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                    {bill.isActive === 0 && (
                        <span style={{ color: 'red', marginLeft: '10px' }}>(Inactive)</span>
                    )}
                    </div>
                    <div className="item-actions">
                    <Link to={`/bills/${bill.id}`} className="action-link edit-link">Edit</Link>
                    </div>
                </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default BillsPage;
