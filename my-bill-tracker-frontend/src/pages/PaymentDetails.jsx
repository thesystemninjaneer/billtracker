// my-bill-tracker-frontend/src/pages/PaymentDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import config from '../config.js';
import './Forms.css'; 
import './PaymentDetails.css';

function PaymentDetails() {
  const { paymentId } = useParams();
  const { authAxios } = useAuth();

  // State
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    amountPaid: '',
    datePaid: '',
    confirmationCode: '',
    notes: ''
  });

  // --- Fetch the Payment Info ---
  const fetchPaymentInfo = async () => {
    if (!paymentId) return;

    try {
      setLoading(true);
      const res = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`);
      if (!res.ok) throw new Error('Failed to fetch payment info');

      const json = await res.json();
      setPayment(json);
      
      // Initialize edit form with fetched data
      setEditForm({
        amountPaid: json.amountPaid || '',
        datePaid: json.datePaid ? json.datePaid.split('T')[0] : '', // Format for date input
        confirmationCode: json.confirmationCode || '',
        notes: json.notes || ''
      });
    } catch (err) {
      console.error(err);
      setError('Unable to load payment info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      setError('Invalid payment reference.');
      return;
    }

    fetchPaymentInfo();
  }, [paymentId, authAxios]);


  // --- Handlers ---
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) throw new Error('Failed to update payment');

      // Refresh data and exit edit mode
      await fetchPaymentInfo();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update payment details.');
    }
  };

  // --- Formatters ---
  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // --- Render ---
  return (
    <div className="info-page-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <Link to="/">Dashboard</Link> <span>/</span>
        {payment && payment.organizationId && (
            <>
                <Link to={`/organizations/${payment.organizationId}`}>{payment.organizationName}</Link> <span>/</span>
            </>
        )}
        <span className="current">Payment Details</span>
      </nav>

      {/* Page Title */}
      <div className="info-header-row">
        <h2 className="info-title">Payment Details</h2>
        {!loading && !error && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="action-link edit-link">
                ✏️ Edit Payment
            </button>
        )}
      </div>

      {/* --- Error / Loading --- */}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="info-section">
            <div className="details-grid skeleton-details"></div>
        </div>
      ) : (
        <>
            {isEditing ? (
                // --- EDIT FORM ---
                <section className="info-section edit-section">
                    <h3>Edit Payment Record</h3>
                    <form onSubmit={handleUpdate} className="edit-payment-form">
                        <div className="form-group">
                            <label>Amount Paid ($)</label>
                            <input 
                                type="number" 
                                name="amountPaid" 
                                value={editForm.amountPaid} 
                                onChange={handleEditChange} 
                                step="0.01" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Date Paid</label>
                            <input 
                                type="date" 
                                name="datePaid" 
                                value={editForm.datePaid} 
                                onChange={handleEditChange} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirmation Code</label>
                            <input 
                                type="text" 
                                name="confirmationCode" 
                                value={editForm.confirmationCode} 
                                onChange={handleEditChange} 
                            />
                        </div>
                        <div className="form-group full-width">
                            <label>Notes</label>
                            <textarea 
                                name="notes" 
                                value={editForm.notes} 
                                onChange={handleEditChange} 
                                rows="3" 
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button type="submit" className="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </section>
            ) : (
                // --- READ ONLY DETAILS ---
                <section className="info-section">
                    <div className="info-section-header">
                        <h3>Transaction Information</h3>
                        <span className={`status-badge ${payment?.paymentStatus}`}>
                            {payment?.paymentStatus?.toUpperCase()}
                        </span>
                    </div>

                    <div className="details-grid">
                        <div>
                            <strong>Organization:</strong>
                            <div className="value-large">{payment?.organizationName || '—'}</div>
                        </div>
                        
                        <div>
                            <strong>Bill Name:</strong>
                            <div className="value">{payment?.billName || '—'}</div>
                        </div>

                        <div>
                            <strong>Amount Paid:</strong>
                            <div className="value highlight-green">
                                {payment?.amountPaid !== undefined
                                  ? formatCurrency(payment.amountPaid)
                                  : '—'}
                            </div>
                        </div>

                        <div>
                            <strong>Date Paid:</strong>
                            <div className="value">{formatDate(payment?.datePaid)}</div>
                        </div>

                        <div>
                            <strong>Amount Due:</strong>
                            <div className="value">
                              {payment?.amountDue !== undefined
                                ? formatCurrency(payment.amountDue)
                                : '—'}
                            </div>
                        </div>

                        <div>
                            <strong>Due Date:</strong>
                            <div className="value">{formatDate(payment?.dueDate)}</div>
                        </div>

                        <div>
                            <strong>Confirmation Code:</strong>
                            <div className="value code-font">{payment?.confirmationCode || '—'}</div>
                        </div>

                        <div>
                            <strong>Payment ID:</strong>
                            <div className="value small-text">{payment?.id}</div>
                        </div>

                        <div className="notes-full">
                            <strong>Notes:</strong>
                            <p>{payment?.notes || 'No notes available.'}</p>
                        </div>
                    </div>
                </section>
            )}
        </>
      )}

      {/* Footer Actions */}
      <div className="info-actions">
        <Link to="/" className="action-link back-link">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default PaymentDetails;