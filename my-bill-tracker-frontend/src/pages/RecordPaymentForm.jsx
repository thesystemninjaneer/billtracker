// my-bill-tracker-frontend/src/pages/RecordPaymentForm.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import config from '../config';
import './Forms.css';

const getNextDueDay = (day) => {
    if (!day || isNaN(day)) return '';
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    if (today.getDate() > day) {
        month += 1;
    }
    const nextDueDate = new Date(year, month, day);
    return nextDueDate.toISOString().split('T')[0];
};

function RecordPaymentForm() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);

    const paymentId = queryParams.get('paymentId');
    const preselectedOrgId = queryParams.get('organizationId');
    const preselectedBillId = queryParams.get('billId'); // FIX: Read billId from URL

    const isUpdateMode = !!paymentId;

    const { authAxios } = useAuth();
    const { addNotification } = useNotification();

    const [organizations, setOrganizations] = useState([]);
    const [billsForOrg, setBillsForOrg] = useState([]);
    
    const [formData, setFormData] = useState({
        organizationId: preselectedOrgId || '',
        billId: preselectedBillId || '', // FIX: Initialize state with billId
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

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const orgsResponse = await authAxios(config.ORGANIZATION_API_BASE_URL);
                if (!orgsResponse.ok) throw new Error('Failed to fetch organizations.');
                const orgsData = await orgsResponse.json();
                setOrganizations(orgsData);

                if (isUpdateMode) {
                    const paymentResponse = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`);
                    if (!paymentResponse.ok) throw new Error('Could not find the specified upcoming bill.');
                    const paymentData = await paymentResponse.json();
                    
                    setFormData(prev => ({
                        ...prev,
                        organizationId: paymentData.organizationId,
                        billId: paymentData.billId || '',
                        dueDate: paymentData.dueDate ? new Date(paymentData.dueDate).toISOString().split('T')[0] : '',
                        amountDue: paymentData.amountDue,
                        amountPaid: paymentData.amountDue,
                    }));
                }
            } catch (err) {
                setError(err.message || 'Could not load initial data.');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [authAxios, isUpdateMode, paymentId]);
    
    useEffect(() => {
        if (isUpdateMode || !formData.organizationId) {
            setBillsForOrg([]);
            return;
        }
        const fetchBillsForOrg = async () => {
            try {
                const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`);
                if (!response.ok) throw new Error('Failed to fetch recurring bills.');
                const allBills = await response.json();
                const relevantBills = allBills.filter(b => b.organizationId.toString() === formData.organizationId);
                setBillsForOrg(relevantBills);

                // FIX: If a bill was pre-selected, find it and populate the form
                if (preselectedBillId) {
                    const selectedBill = relevantBills.find(b => b.id.toString() === preselectedBillId);
                    if (selectedBill) {
                        setFormData(prev => ({
                            ...prev,
                            amountDue: selectedBill.typicalAmount || '',
                            amountPaid: selectedBill.typicalAmount || '',
                            dueDate: selectedBill.dueDay ? getNextDueDay(selectedBill.dueDay) : '',
                        }));
                    }
                }

            } catch (err) {
                console.error("Error fetching bills for org:", err);
            }
        };
        fetchBillsForOrg();
    }, [formData.organizationId, isUpdateMode, authAxios, preselectedBillId]);
    
    // This effect runs when the user MANUALLY changes the dropdown
    useEffect(() => {
        if (isUpdateMode || !formData.billId) return;

        const selectedBill = billsForOrg.find(b => b.id.toString() === formData.billId);
        if (selectedBill) {
            setFormData(prev => ({
                ...prev,
                amountDue: selectedBill.typicalAmount || '',
                amountPaid: selectedBill.typicalAmount || '',
                dueDate: selectedBill.dueDay ? getNextDueDay(selectedBill.dueDay) : prev.dueDate,
            }));
        }
    }, [formData.billId, billsForOrg, isUpdateMode]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            let response;
            if (isUpdateMode) {
                response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments/${paymentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        datePaid: formData.datePaid, amountPaid: parseFloat(formData.amountPaid),
                        confirmationCode: formData.confirmationCode, notes: formData.notes,
                    }),
                });
            } else {
                response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        organizationId: parseInt(formData.organizationId),
                        billId: formData.billId ? parseInt(formData.billId) : null,
                        amountDue: parseFloat(formData.amountDue), amountPaid: parseFloat(formData.amountPaid),
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
            <h2>{isUpdateMode ? `Record Payment` : 'Record a New Payment'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Billing Organization:</label>
                    <select name="organizationId" value={formData.organizationId} onChange={handleChange} required disabled={isUpdateMode || !!preselectedOrgId}>
                        <option value="">Select an Organization</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                    </select>
                </div>
                {!isUpdateMode && formData.organizationId && (
                     <div className="form-group">
                        <label>Link to Recurring Bill (Optional):</label>
                        <select name="billId" value={formData.billId} onChange={handleChange}>
                            <option value="">None (Ad-Hoc Payment)</option>
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
                    {isSubmitting ? 'Submitting...' : 'Save'}
                </button>
            </form>
        </div>
    );
}

export default RecordPaymentForm;

