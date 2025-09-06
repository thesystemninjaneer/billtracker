// my-bill-tracker-frontend/src/pages/RecordPaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import config from '../config.js';
import './Forms.css';

function RecordPaymentForm() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const paymentId = queryParams.get('paymentId'); // For updating an upcoming bill
    
    // Determine the mode based on the presence of paymentId
    const isUpdateMode = !!paymentId;

    const { authAxios } = useAuth();
    const { addNotification } = useNotification();

    const [organizations, setOrganizations] = useState([]);
    const [billsForOrg, setBillsForOrg] = useState([]);
    const [formData, setFormData] = useState({
        organizationId: '',
        billId: '',
        dueDate: '',
        amountDue: '',
        datePaid: new Date().toISOString().split('T')[0],
        amountPaid: '',
        confirmationCode: '',
        notes: '',
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Effect 1: Fetch all organizations for the dropdown
    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const response = await authAxios(config.ORGANIZATION_API_BASE_URL);
                if (!response.ok) throw new Error('Failed to fetch organizations.');
                const data = await response.json();
                setOrganizations(data);
            } catch (err) {
                setError('Could not load organizations. Please try again later.');
            }
        };
        fetchOrgs();
    }, [authAxios]);

    // Effect 2: If in update mode, fetch the specific payment record
    useEffect(() => {
        const fetchPaymentRecord = async () => {
            if (isUpdateMode) {
                try {
                    const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`);
                    if (!response.ok) throw new Error('Could not find the specified upcoming bill.');
                    const data = await response.json();
                    
                    setFormData(prev => ({
                        ...prev,
                        organizationId: data.organizationId,
                        billId: data.billId || '',
                        dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
                        amountDue: data.amountDue,
                        // Pre-fill amount paid with amount due for convenience
                        amountPaid: data.amountDue,
                    }));

                } catch (err) {
                    setError(err.message);
                }
            }
            setLoading(false); // End loading after this effect runs (or doesn't)
        };
        fetchPaymentRecord();
    }, [isUpdateMode, paymentId, authAxios]);

    // Effect 3: Fetch related bills when an organization is selected in "Create Mode"
    useEffect(() => {
        if (isUpdateMode || !formData.organizationId) {
            setBillsForOrg([]);
            return;
        };

        const fetchBillsForOrg = async () => {
            try {
                const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`);
                if (!response.ok) throw new Error('Failed to fetch recurring bills.');
                const allBills = await response.json();
                setBillsForOrg(allBills.filter(b => b.organizationId.toString() === formData.organizationId));
            } catch (err) {
                console.error("Error fetching bills for org:", err);
            }
        };
        fetchBillsForOrg();
    }, [formData.organizationId, isUpdateMode, authAxios]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        
        try {
            let response;
            if (isUpdateMode) {
                // UPDATE an existing upcoming payment record
                response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        datePaid: formData.datePaid,
                        amountPaid: parseFloat(formData.amountPaid),
                        confirmationCode: formData.confirmationCode,
                        notes: formData.notes,
                    }),
                });
            } else {
                // CREATE a new payment record
                response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        organizationId: parseInt(formData.organizationId),
                        billId: formData.billId ? parseInt(formData.billId) : null,
                        amountDue: parseFloat(formData.amountDue),
                        amountPaid: parseFloat(formData.amountPaid),
                    }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to record payment.');
            }
            addNotification('Payment recorded successfully!', 'success');
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="form-container">Loading...</div>;
    if (error) return <div className="form-container error-message">{error}</div>;

    return (
        <div className="form-container">
            <h2>{isUpdateMode ? `Record Payment for Upcoming Bill` : 'Record a New Payment'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Billing Organization:</label>
                    <select name="organizationId" value={formData.organizationId} onChange={handleChange} required disabled={isUpdateMode}>
                        <option value="">Select an Organization</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                    </select>
                </div>

                {!isUpdateMode && formData.organizationId && (
                     <div className="form-group">
                        <label>Link to Recurring Bill (Optional):</label>
                        <select name="billId" value={formData.billId} onChange={handleChange}>
                            <option value="">None</option>
                            {billsForOrg.map(bill => <option key={bill.id} value={bill.id}>{bill.billName}</option>)}
                        </select>
                    </div>
                )}
                
                {!isUpdateMode && (
                    <>
                        <div className="form-group">
                            <label>Bill Due Date:</label>
                            <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Amount Due ($):</label>
                            <input type="number" name="amountDue" value={formData.amountDue} onChange={handleChange} step="0.01" required />
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label>Amount Paid ($):</label>
                    <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} step="0.01" required />
                </div>
                <div className="form-group">
                    <label>Date Paid:</label>
                    <input type="date" name="datePaid" value={formData.datePaid} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Confirmation Code (Optional):</label>
                    <input type="text" name="confirmationCode" value={formData.confirmationCode} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Notes (Optional):</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3"></textarea>
                </div>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                </button>
            </form>
        </div>
    );
}

export default RecordPaymentForm;

