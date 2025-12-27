// my-bill-tracker-frontend/src/pages/BillsPage.jsx
// Part 1: Imports & State Setup
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css';
import './Dashboard.css';

function BillsPage() {
  const { id: editId } = useParams();
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
  const [searchTerm, setSearchTerm] = useState('');
  const BILLS_PER_PAGE = 10;
  const [billsCurrentPage, setBillsCurrentPage] = useState(1);

  //Helper functions
  const renderBillsPagination = () => {
    if (totalBillPages <= 1) return null;

    const pages = [];

    for (let i = 1; i <= totalBillPages; i++) {
      if (
        i === 1 ||
        i === totalBillPages ||
        Math.abs(i - billsCurrentPage) <= 1
      ) {
        pages.push(
          <button
            key={i}
            className={`pagination-btn ${i === billsCurrentPage ? 'active' : ''}`}
            onClick={() => setBillsCurrentPage(i)}
          >
            {i}
          </button>
        );
      } else if (pages[pages.length - 1] !== '...') {
        pages.push(
          <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
        );
      }
    }

    return <div className="pagination-container mt-6">{pages}</div>;
  };


  // Part 2: Fetch Orgs, Bills & Bill by ID
  // Load all bills
  const fetchBills = useCallback(async (search = '') => {

    try {
      setLoading(true);
      const query = `?search=${encodeURIComponent(search)}${showInactive ? '&includeInactive=true' : ''}`;
      
      const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills${query}`);
      const data = await response.json();
      setBills(data || []);
    } catch (err) {
      console.error("Failed to load bills", err);
    } finally {
      setLoading(false);
    }
  }, [authAxios, showInactive]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch organizations and bills together
        const [orgsRes, billsRes] = await Promise.all([
          authAxios(`${config.ORGANIZATION_API_BASE_URL}?limit=1000`),
          authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills?search=${encodeURIComponent(searchTerm)}${showInactive ? '&includeInactive=true' : ''}`)
        ]);

        if (!orgsRes.ok || !billsRes.ok) throw new Error("Failed to load page data.");

        const orgsData = await orgsRes.json();
        const billsData = await billsRes.json();

        setOrganizations(orgsData.organizations || []);
        setBills(billsData || []);

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [authAxios, showInactive]);

  // If in edit mode, fetch that bill’s data
  useEffect(() => {
    if (editId) {
      const billToEdit = bills.find(b => b.id.toString() === editId);
      if (billToEdit) {
          setFormData({
            organizationId: billToEdit.organizationId || '',
            billName: billToEdit.billName || '',
            dueDay: billToEdit.dueDay || '',
            typicalAmount: billToEdit.typicalAmount || '',
            frequency: billToEdit.frequency || 'monthly',
            notes: billToEdit.notes || '',
            isActive: billToEdit.isActive !== 0,
          });
          setIsFormVisible(true);
          setIsEditing(true);
        }
      }
    }, [editId, bills]);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchBills(searchTerm);
    }, 500);

    return () => clearTimeout(delay);
  }, [searchTerm, fetchBills]);

  useEffect(() => {
    setBillsCurrentPage(1);
  }, [searchTerm, showInactive]);


  // Part 3 form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      isActive: formData.isActive ? 1 : 0
    };
      const url = isEditing ? `${config.BILL_PAYMENT_API_BASE_URL}/bills/${editId}` : `${config.BILL_PAYMENT_API_BASE_URL}/bills`;
      const method = isEditing ? 'PUT' : 'POST';
    try {
      const response = await authAxios(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save bill.');
      }
      navigate('/bills'); // Go to the clean list view
      fetchBills(); // Refresh the list
      setIsFormVisible(false);
      setIsEditing(false);
    } catch (err) {
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

  const totalBillPages = Math.ceil(bills.length / BILLS_PER_PAGE);

  const billsToShow = bills.slice(
    (billsCurrentPage - 1) * BILLS_PER_PAGE,
    billsCurrentPage * BILLS_PER_PAGE
  );

  return (
    <div className="dashboard-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Recurring Bills</h2>
        {!isFormVisible && (
          <button onClick={showAddForm} className="action-link website-link">Add New Bill</button>
        )}
      </div>

      {isFormVisible ? (
        // --- FORM VIEW ---
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
      ) : (
        // --- LIST VIEW ---
        <>
          {/* checkbox to be left-justified above the list */}
          <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <label>
                <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(prev => !prev)} />
                {' '}Show Inactive Bills
            </label>
          </div>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border rounded-md"
            />
          </div>
          <section className="dashboard-section">
            {loading ? (
              <p>Loading bills...</p>
            ) : bills.length === 0 ? (
              <p>
                No recurring bills yet.{' '}
                <button onClick={showAddForm} className="action-link">
                  Add one now
                </button>.
              </p>
            ) : (
              <>
                <ul>
                  {billsToShow.map(bill => (
                    <li key={bill.id} className="bill-item">
                      <div>
                        <span className="bill-org">{bill.organizationName}</span>
                        {bill.billName && (
                          <Link
                            to={`/organizations/${bill.organizationId}/bills/${bill.id}/info`}
                            className="bill-name"
                            style={{ marginLeft: '5px', color: '#3182ce', textDecoration: 'none' }}
                          >
                            ({bill.billName})
                          </Link>
                        )}
                        {bill.isActive === 0 && (
                          <span style={{ color: 'red', marginLeft: '10px' }}>(Inactive)</span>
                        )}
                      </div>
                      <div className="item-actions">
                        <Link to={`/bills/${bill.id}`} className="action-link edit-link">
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>

                {renderBillsPagination()}
              </>
            )}
          </section>

        </>
        )}
        </div>
    );
}

export default BillsPage;