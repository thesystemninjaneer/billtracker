// my-bill-tracker-frontend/src/pages/BillOrganizationForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import config from '../config.js';
import './Forms.css';
import './Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

// Helper function to check for similar organization names
const getSimilarOrganization = (name, orgs) => {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedName.length < 3) return null;

    for (const org of orgs) {
        const normalizedOrgName = org.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedOrgName.includes(normalizedName) || normalizedName.includes(normalizedOrgName)) {
            return org;
        }
    }
    return null;
};

function OrganizationsPage() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { authAxios } = useAuth();

    // UI State
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isListCollapsed, setIsListCollapsed] = useState(false);

    // List State
    const [listData, setListData] = useState({ organizations: [], totalPages: 1, currentPage: 1 });
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Form State
    const [formData, setFormData] = useState({ name: '', accountNumber: '', typicalDueDay: '', website: '', contactInfo: '' });
    const [formError, setFormError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [allOrganizations, setAllOrganizations] = useState([]);
    const [similarOrg, setSimilarOrg] = useState(null);

    // Helper functions 
    const renderOrgListPagination = () => {
        const totalPages = listData.totalPages;
        if (totalPages <= 1) return null;

        const pages = [];

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                Math.abs(i - currentPage) <= 1
            ) {
                pages.push(
                    <button
                        key={i}
                        className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
                        onClick={() => setCurrentPage(i)}
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

    const fetchOrganizations = useCallback(async (search, page) => {
        setListLoading(true);
        setListError(null);
        try {
            const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}?search=${search}&page=${page}&limit=20`);
            if (!response.ok) throw new Error('Failed to fetch organizations.');
            const responseData = await response.json();
            setListData(responseData);
        } catch (err) {
            setListError(err.message);
        } finally {
            setListLoading(false);
        }
    }, [authAxios]);
    
    useEffect(() => {
        const fetchAllOrgs = async () => {
             try {
                const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}?limit=1000`);
                if(response.ok) {
                    const data = await response.json();
                    setAllOrganizations(data.organizations);
                }
            } catch(err) { console.error("Could not fetch all organizations for similarity check", err); }
        };
        fetchAllOrgs();
    }, [authAxios]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setCurrentPage(1);
            fetchOrganizations(searchTerm, 1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, fetchOrganizations]);

    useEffect(() => {
        fetchOrganizations(searchTerm, currentPage);
    }, [currentPage, fetchOrganizations]);

    useEffect(() => {
        if (editId) {
            setIsEditing(true);
            setIsFormVisible(true);
            setIsListCollapsed(true);
            const fetchOrg = async () => {
                try {
                    const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}/${editId}`);
                    if (!response.ok) throw new Error('Organization not found.');
                    const data = await response.json();
                    setFormData(data);
                } catch (err) { setFormError(err.message); }
            };
            fetchOrg();
        } else {
            setIsEditing(false);
        }
    }, [editId, authAxios]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const submitFormData = async () => {
        setFormError(null);
        setSimilarOrg(null);
        const url = isEditing ? `${config.ORGANIZATION_API_BASE_URL}/${editId}` : config.ORGANIZATION_API_BASE_URL;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const response = await authAxios(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to save organization.');
            }
            navigate('/organizations', { replace: true });
            setIsFormVisible(false);
            fetchOrganizations('', 1); // Refresh list with no search term
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) { submitFormData(); }
        else {
            const foundSimilar = getSimilarOrganization(formData.name, allOrganizations);
            if (foundSimilar) { setSimilarOrg(foundSimilar); }
            else { submitFormData(); }
        }
    };
    
    const showAddForm = () => {
        setIsEditing(false);
        setIsFormVisible(true);
        setIsListCollapsed(true);
        setFormData({ name: '', accountNumber: '', typicalDueDay: '', website: '', contactInfo: '' });
    };

    const hideForm = () => {
        setIsFormVisible(false);
        setIsListCollapsed(false);
        if(isEditing) navigate('/organizations', { replace: true });
    }

    return (
        <>
            <div className="dashboard-container">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Organizations</h2>
                    {!isFormVisible && (
                         <button onClick={showAddForm} className="action-link website-link">Add New Organization</button>
                    )}
                </div>

                {isFormVisible && (
                    <div className="form-container mb-8">
                        <h3 className="text-2xl mb-4">{isEditing ? 'Edit Organization' : 'Add New Organization'}</h3>
                        {formError && <p className="error-message">{formError}</p>}
                        <form onSubmit={handleSubmit}>
                            {/* Form fields */}
                            <div className="form-group"><label>Organization Name:</label><input type="text" name="name" value={formData.name} onChange={handleChange} required /></div>
                            <div className="form-group"><label>Account ID/Number:</label><input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} required /></div>
                            <div className="form-group"><label>Typical Due Day (1-31):</label><input type="number" name="typicalDueDay" value={formData.typicalDueDay} onChange={handleChange} min="1" max="31" /></div>
                            <div className="form-group"><label>Website (Optional):</label><input type="url" name="website" value={formData.website} onChange={handleChange} /></div>
                            <div className="form-group"><label>Contact Info (Optional):</label><input type="text" name="contactInfo" value={formData.contactInfo} onChange={handleChange} /></div>
                            <div className="form-actions">
                                <button type="button" onClick={hideForm} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">{isEditing ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                )}
                
                <section className="dashboard-section">
                    <h3 onClick={() => setIsListCollapsed(!isListCollapsed)} className="collapsible-header">
                         <FontAwesomeIcon icon={isListCollapsed ? faChevronDown : faChevronUp} /> Your Organizations
                    </h3>
                    {!isListCollapsed && (
                        <>
                            <div className="mb-6 mt-4">
                                <input type="text" placeholder="Search by name, account #, or website..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 border rounded-md" />
                            </div>

                            {listLoading && <p>Loading...</p>}
                            {listError && <p className="error-message">{listError}</p>}
                            
                            {!listLoading && !listError && (
                                <>
                                    {listData.organizations.length > 0 ? (
                                        <ul>{listData.organizations.map(org => (
                                            <li key={org.id} className="bill-item organization-group">
                                                <div className="flex-grow"><span className="bill-org">{org.name}</span><span> (Account: {org.accountNumber || 'N/A'})</span></div>
                                                <div className="item-actions">
                                                    {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="action-link website-link">Website</a>}
                                                    <Link to={`/organizations/${org.id}`} className="action-link edit-link">Edit</Link>
                                                </div>
                                            </li>
                                        ))}</ul>
                                    ) : (<p>No organizations found.</p>)}
                
                                    {renderOrgListPagination()}
                                </>
                            )}
                        </>
                    )}
                </section>
            </div>
            {similarOrg && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md text-center">
                        <h3 className="text-xl font-bold mb-4">Potential Duplicate Found</h3>
                        <p className="mb-4 text-gray-700">The name you entered is similar to: <strong>{similarOrg.name}</strong>.</p>
                        <p className="mb-6 text-gray-600">Are you sure you want to create a new organization?</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setSimilarOrg(null)} className="px-6 py-2 bg-gray-200 rounded-md">Cancel</button>
                            <button onClick={submitFormData} className="px-6 py-2 bg-blue-600 text-white rounded-md">Proceed Anyway</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OrganizationsPage;

