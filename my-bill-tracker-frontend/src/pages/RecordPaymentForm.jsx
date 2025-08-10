//7. Form for recording details of a monthly bill payment.
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css';

// Helper function to calculate the next calendar occurrence of a given day of the month
const getNextDueDay = (day) => {
    if (!day) return '';

    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    // Check if the typical due day has already passed this month
    if (today.getDate() > day) {
        month += 1;
    }

    const nextDueDate = new Date(year, month, day);
    
    // Format the date to 'YYYY-MM-DD' for the input field
    const yyyy = nextDueDate.getFullYear();
    const mm = String(nextDueDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDueDate.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
};


function RecordPaymentForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const preselectedOrgId = queryParams.get('organizationId');

    const { authAxios } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [billsForOrg, setBillsForOrg] = useState([]);
    const [formData, setFormData] = useState({
        organizationId: preselectedOrgId || '',
        billId: '',
        dueDate: '',
        amountDue: '',
        datePaid: new Date().toISOString().split('T')[0],
        paymentConfirmationCode: '',
        amountPaid: '',
        notes: '',
    });
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Main useEffect to fetch all organizations on component load
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);
                setError(null);

                // Fetch all organizations
                const orgsResponse = await authAxios(config.ORGANIZATION_API_BASE_URL);
                if (!orgsResponse.ok) throw new Error('Failed to fetch organizations.');
                const orgsData = await orgsResponse.json();
                setOrganizations(orgsData);

                // If an organization is pre-selected, update the form state
                if (preselectedOrgId) {
                    const foundOrg = orgsData.find(org => org.id.toString() === preselectedOrgId);
                    if (foundOrg) {
                        const nextDueDate = getNextDueDay(foundOrg.typicalDueDay);
                        setFormData(prev => ({
                            ...prev,
                            organizationId: foundOrg.id.toString(),
                            dueDate: nextDueDate,
                        }));
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

    // Effect to handle fetching bills and populating fields when organization or bill changes
    useEffect(() => {
        const updateFields = async () => {
            const selectedOrgId = formData.organizationId;
            const selectedBillId = formData.billId;

            // Only proceed if an organization is selected
            if (selectedOrgId) {
                try {
                    // Fetch all bills for the selected organization
                    const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`);
                    if (!response.ok) throw new Error('Failed to fetch recurring bills.');
                    const allBills = await response.json();
                    const bills = allBills.filter(bill => bill.organizationId.toString() === selectedOrgId);
                    setBillsForOrg(bills);

                    // Find the selected bill to populate amount and due date
                    const selectedBill = bills.find(bill => bill.id.toString() === selectedBillId);

                    if (selectedBill) {
                        // Populate fields based on the selected bill
                        const newDueDate = selectedBill.dueDay !== undefined ? getNextDueDay(selectedBill.dueDay) : formData.dueDate;
                        const newAmountDue = selectedBill.typicalAmount !== undefined ? selectedBill.typicalAmount : '';
                        const newAmountPaid = selectedBill.typicalAmount !== undefined ? selectedBill.typicalAmount : '';

                        setFormData(prev => ({
                            ...prev,
                            amountDue: newAmountDue,
                            amountPaid: newAmountPaid,
                            dueDate: newDueDate,
                        }));
                    } else if (!selectedBillId) {
                        // If no specific bill is selected but an organization is, set the organization's default due date
                        const foundOrg = organizations.find(org => org.id.toString() === selectedOrgId);
                        if (foundOrg && foundOrg.typicalDueDay) {
                           const orgDueDate = getNextDueDay(foundOrg.typicalDueDay);
                           setFormData(prev => ({
                               ...prev,
                               dueDate: orgDueDate,
                               amountDue: '',
                               amountPaid: '',
                           }));
                        } else {
                             // If no bill is selected and no organization due day is available, clear the fields
                             setFormData(prev => ({
                                ...prev,
                                amountDue: '',
                                amountPaid: '',
                            }));
                        }
                    }

                } catch (err) {
                    console.error("Failed to fetch bills for selected organization:", err);
                    setBillsForOrg([]);
                    setFormData(prev => ({
                        ...prev,
                        billId: '',
                        amountDue: '',
                        amountPaid: '',
                        dueDate: ''
                    }));
                }
            } else {
                 // Clear bills and fields if no organization is selected
                setBillsForOrg([]);
                setFormData(prev => ({
                    ...prev,
                    billId: '',
                    amountDue: '',
                    amountPaid: '',
                    dueDate: ''
                }));
            }
        };
        // Debounce or add a check to avoid unnecessary runs if state is stable
        if (formData.organizationId !== '' || formData.billId !== '') {
            updateFields();
        }
    }, [formData.organizationId, formData.billId, authAxios, organizations]); // Added organizations to dependency array

    // A simple handleChange for all form fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null); // Clear previous success message

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
                billId: formData.billId ? parseInt(formData.billId) : null,
                dueDate: formData.dueDate,
                amountDue: parseFloat(formData.amountDue),
                datePaid: formData.datePaid,
                paymentConfirmationCode: formData.paymentConfirmationCode,
                amountPaid: parseFloat(formData.amountPaid),
                notes: formData.notes,
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

            setSuccessMessage(`Payment recorded successfully!`);
            setTimeout(() => {
                navigate('/');
            }, 2000);
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
            {successMessage && <p className="success-message">{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="organizationId">Billing Organization:</label>
                    <select
                        id="organizationId"
                        name="organizationId"
                        value={formData.organizationId}
                        onChange={handleChange}
                        required
                        disabled={!!preselectedOrgId}
                    >
                        <option value="">Select an Organization</option>
                        {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
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
