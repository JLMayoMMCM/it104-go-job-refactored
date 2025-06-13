'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../register.css';

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyDescription: '',
    // Company address fields
    companyPremiseName: '',
    companyStreetName: '',
    companyBarangayName: '',
    companyCityName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation for company registration
    if (!formData.companyName || !formData.companyEmail) {
      setError('Company name and email are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: 'company',
          ...formData
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Company registration successful! Your Company ID is: ${data.companyId}. Save this ID for your employees to use when registering.`);
        setTimeout(() => {
          router.push('/Login');
        }, 5000);
      } else {
        setError(data.error || 'Company registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <img src="/Assets/Title.png" alt="GO JOB" className="logo" />
        <h2 className="register-title">REGISTER COMPANY</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleRegister} className="register-form">
          <div className="section-title">Company Information</div>
          
          <div className="input-group">
            <label htmlFor="companyName">COMPANY NAME</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="companyEmail">COMPANY EMAIL</label>
              <input
                type="email"
                id="companyEmail"
                name="companyEmail"
                value={formData.companyEmail}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="companyPhone">COMPANY PHONE</label>
              <input
                type="tel"
                id="companyPhone"
                name="companyPhone"
                value={formData.companyPhone}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="companyWebsite">COMPANY WEBSITE</label>
            <input
              type="url"
              id="companyWebsite"
              name="companyWebsite"
              value={formData.companyWebsite}
              onChange={handleInputChange}
              placeholder="https://example.com (Optional)"
            />
          </div>

          <div className="input-group">
            <label htmlFor="companyDescription">COMPANY DESCRIPTION</label>
            <textarea
              id="companyDescription"
              name="companyDescription"
              value={formData.companyDescription}
              onChange={handleInputChange}
              rows="3"
              placeholder="Brief description of your company (Optional)"
            />
          </div>

          {/* Company Address Section */}
          <div className="section-title">Company Address</div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="companyPremiseName">BUILDING/PREMISE</label>
              <input
                type="text"
                id="companyPremiseName"
                name="companyPremiseName"
                value={formData.companyPremiseName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
            <div className="input-group">
              <label htmlFor="companyStreetName">STREET</label>
              <input
                type="text"
                id="companyStreetName"
                name="companyStreetName"
                value={formData.companyStreetName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="companyBarangayName">BARANGAY</label>
              <input
                type="text"
                id="companyBarangayName"
                name="companyBarangayName"
                value={formData.companyBarangayName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
            <div className="input-group">
              <label htmlFor="companyCityName">CITY</label>
              <input
                type="text"
                id="companyCityName"
                name="companyCityName"
                value={formData.companyCityName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? 'Registering Company...' : 'REGISTER COMPANY'}
          </button>
        </form>

        <div className="login-section">
          <span>Back to user registration?</span>
          <button 
            type="button" 
            className="login-link-btn"
            onClick={() => router.push('/Login/Register')}
          >
            User Registration
          </button>
        </div>
      </div>
    </div>
  );
}
