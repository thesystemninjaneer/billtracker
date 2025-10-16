// my-bill-tracker-frontend/src/pages/EditBillForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Forms.css';

function EditBillForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { authAxios } = useAuth();
    const [organizations, setOrganizations] = useState([]);
    const [formData, setFormData] = useState({
        organizationId: '',
        billName: '',
        dueDay: '',
        typicalAmount: '',
        frequency: 'monthly',
        notes: '',
        isActive: true,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [billRes, orgsRes] = await Promise.all([
                    authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills/${id}`),
                    authAxios(config.ORGANIZATION_API_BASE_URL)
                ]);

                if (!billRes.ok || !orgsRes.ok) throw new Error('Failed to fetch initial data.');

                const billData = await billRes.json();
                const orgsData = await orgsRes.json();
                console.log('Fetched organizations:', orgsData);

                setFormData({
                    organizationId: billData.organizationId,
                    billName: billData.billName,
                    dueDay: billData.dueDay || '',
                    typicalAmount: billData.typicalAmount || '',
                    frequency: billData.frequency || 'monthly',
                    notes: billData.notes || '',
                    isActive: billData.isActive !== 0, // Convert 0/1 to boolean
                });
                setOrganizations(orgsData.organizations); // recieves an array
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, authAxios]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    isActive: formData.isActive ? 1 : 0, // Convert boolean back to 0/1
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update bill.');
            }
            navigate('/edit-bills');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="form-container">Loading bill details...</div>;

    return (
        <div className="form-container">
            <h2>Edit Recurring Bill</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Billing Organization:</label>
                    <select name="organizationId" value={formData.organizationId} onChange={handleChange} required>
                        <option value="">Select an Organization</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Bill Name (e.g., Electricity, Internet):</label>
                    <input type="text" name="billName" value={formData.billName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label>Typical Due Day of Month (1-31):</label>
                    <input type="number" name="dueDay" value={formData.dueDay} onChange={handleChange} min="1" max="31" />
                </div>
                <div className="form-group">
                    <label>Typical Amount ($):</label>
                    <input type="number" name="typicalAmount" value={formData.typicalAmount} onChange={handleChange} step="0.01" min="0" />
                </div>
                <div className="form-group">
                    <label>Frequency:</label>
                    <select name="frequency" value={formData.frequency} onChange={handleChange} required>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                        <option value="weekly">Weekly</option>
                        <option value="one-time">One-Time</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Notes:</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3"></textarea>
                </div>
                 <div className="form-group">
                    <label>
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                        This recurring bill is active
                    </label>
                </div>
                <button type="submit" className="btn-primary">Save Changes</button>
            </form>
        </div>
    );
}

export default EditBillForm;
