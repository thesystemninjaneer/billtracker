// my-bill-tracker-frontend/src/pages/BillOrganizationForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../config'; // Import the config
import './Forms.css'; // Shared styles for forms
import { useAuth } from '../context/AuthContext'; // Import useAuth hook

function BillOrganizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authAxios } = useAuth(); // Get authAxios from context
 
  const [formData, setFormData] = useState({
    name: '',
    accountNumber: '',
    typicalDueDay: '', // Day of the month, e.g., '15'
    website: '',
    contactInfo: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (id) {
        setIsEditing(true);
        try {
          setLoading(true);
          setError(null);
          // Use authAxios for authenticated GET request
          //.const response = await fetch(`${config.ORGANIZATION_API_BASE_URL}/${id}`);
          const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}/${id}`);
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Organization not found.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setFormData(data);
        } catch (err) {
          console.error("Failed to fetch organization:", err);
          setError("Failed to load organization details. Please try again.");
          navigate('/'); // Redirect on error or not found
        } finally {
          setLoading(false);
        }
      } else {
        setIsEditing(false);
        setFormData({ // Reset form for new entry
          name: '',
          accountNumber: '',
          typicalDueDay: '',
          website: '',
          contactInfo: '',
        });
        setLoading(false); // No loading needed for new form
      }
    };

    fetchOrganization();
  }, [id, navigate, authAxios]); // Add authAxios to dependency array
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${config.ORGANIZATION_API_BASE_URL}/${id}` : config.ORGANIZATION_API_BASE_URL;

      // Use authAxios for authenticated POST/PUT request
      const response = await authAxios(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // Authorization header is handled by authAxios
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      alert(`Organization ${isEditing ? 'updated' : 'added'} successfully!`);
      navigate('/');
    } catch (err) {
      console.error('Error submitting organization:', err);
      setError(`Failed to ${isEditing ? 'update' : 'add'} organization: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${formData.name}?`)) {
      return;
    }
    setError(null); // Clear previous errors

    try {
      // Use authAxios for authenticated DELETE request
      const response = await authAxios(`${config.ORGANIZATION_API_BASE_URL}/${id}`, {
        method: 'DELETE',
        // Authorization header is handled by authAxios
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      alert(`Organization ${formData.name} deleted successfully!`);
      navigate('/');
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError(`Failed to delete organization: ${err.message}`);
    }
  };

  if (loading && isEditing) {
    return <div className="form-container">Loading organization details...</div>;
  }

  return (
    <div className="form-container">
      <h2>{isEditing ? 'Edit Bill Organization' : 'Add New Bill Organization'}</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Organization Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="accountNumber">Account Number:</label>
          <input
            type="text"
            id="accountNumber"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="typicalDueDay">Typical Due Day (1-31):</label>
          <input
            type="number"
            id="typicalDueDay"
            name="typicalDueDay"
            value={formData.typicalDueDay}
            onChange={handleChange}
            min="1"
            max="31"
          />
        </div>
        <div className="form-group">
          <label htmlFor="website">Website (Optional):</label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="contactInfo">Contact Info (Optional):</label>
          <input
            type="text"
            id="contactInfo"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {isEditing ? 'Update Organization' : 'Add Organization'}
          </button>
          {isEditing && (
            <button type="button" onClick={handleDelete} className="btn-danger">
              Delete Organization
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default BillOrganizationForm;