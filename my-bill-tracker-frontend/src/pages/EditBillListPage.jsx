// my-bill-tracker-frontend/src/pages/EditListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import config from '../config';
import './Dashboard.css'; // Reuse dashboard styles for consistency

function EditBillListPage() {
    const { authAxios } = useAuth();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const response = await authAxios(`${config.BILL_PAYMENT_API_BASE_URL}/bills`);
                if (!response.ok) {
                    throw new Error('Failed to fetch recurring bills.');
                }
                const data = await response.json();
                setBills(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, [authAxios]);

    if (loading) return <div className="dashboard-container">Loading bills...</div>;
    if (error) return <div className="dashboard-container error-message">{error}</div>;

    return (
        <div className="dashboard-container">
            <h2>Edit Recurring Bills</h2>
            <p className="info-message" style={{ textAlign: 'left', marginBottom: '20px' }}>
                Select a recurring bill to edit its details. Changes made here will serve as a template for future payments but will not alter existing upcoming or paid records.
            </p>
            
            <section className="dashboard-section">
                {bills.length === 0 ? (
                    <p>You have not added any recurring bills yet. <Link to="/add-bill">Add one now!</Link></p>
                ) : (
                    <ul>
                        {bills.map(bill => (
                            <li key={bill.id} className="bill-item">
                                <div>
                                    <span className="bill-org">{bill.organizationName}</span>
                                    {bill.billName && <span className="bill-name"> ({bill.billName})</span>}
                                </div>
                                <div className="item-actions">
                                    <Link to={`/edit-bill/${bill.id}`} className="action-link edit-link">Edit</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

export default EditBillListPage;
