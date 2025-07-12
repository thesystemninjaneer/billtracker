//6. Form for adding or editing bill organization details.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Forms.css'; // Shared styles for forms

function BillOrganizationForm() {
  const { id } = useParams(); // Used for editing an existing organization
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    accountNumber: '',
    typicalDueDay: '', // Day of the month, e.g., '15'
    website: '',
    contactInfo: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEditing(true);
      // In a real app, you'd fetch organization data by ID here:
      // fetchOrganizationDetails(id).then(data => setFormData(data));
      // For now, simulate fetching data for editing:
      const simulatedOrg = {
        name: 'Simulated Power Co.',
        accountNumber: '123456789',
        typicalDueDay: '20',
        website: 'https://powerco.com',
        contactInfo: '1-800-POWER',
      };
      setFormData(simulatedOrg);
    } else {
      setIsEditing(false);
      setFormData({ // Reset form for new entry
        name: '',
        accountNumber: '',
        typicalDueDay: '',
        website: '',
        contactInfo: '',
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      console.log('Updating organization:', formData);
      // Call API to update organization
    } else {
      console.log('Adding new organization:', formData);
      // Call API to add new organization
    }
    alert(`${isEditing ? 'Updated' : 'Added'} organization: ${formData.name}`);
    navigate('/'); // Go back to dashboard after submission
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${formData.name}?`)) {
      console.log('Deleting organization with ID:', id);
      // Call API to delete organization
      alert(`Deleted organization: ${formData.name}`);
      navigate('/');
    }
  };

  return (
    <div className="form-container">
      <h2>{isEditing ? 'Edit Bill Organization' : 'Add New Bill Organization'}</h2>
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