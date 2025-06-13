'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './register.css';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    userType: 'job-seeker',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyId: '', // For employees
    companyName: '', // For company registration
    companyEmail: '', // For company registration
    companyPhone: '', // For company registration
    companyWebsite: '', // For company registration
    companyDescription: '', // For company registration
    // Address fields for person
    premiseName: '',
    streetName: '',
    barangayName: '',
    cityName: '',
    // Company address fields
    companyPremiseName: '',
    companyStreetName: '',
    companyBarangayName: '',
    companyCityName: '',
    nationalityName: 'Filipino'
  });  const [companies, setCompanies] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerificationOptions, setShowVerificationOptions] = useState(false);
  // Fetch companies when user type is employer and nationalities on mount
  useEffect(() => {
    loadNationalities();
    if (formData.userType === 'employer') {
      fetchCompanies();
    }
  }, [formData.userType]);

  const loadNationalities = async () => {
    try {
      const response = await fetch('/api/nationalities');
      if (response.ok) {
        const data = await response.json();
        setNationalities(data);
      }
    } catch (error) {
      console.error('Error loading nationalities:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        console.error('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

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

    // Validation only for job-seeker and employee (not company)
    if (formData.userType !== 'company') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }
    }

    // Validate based on user type
    if (formData.userType === 'employee' && !formData.companyId) {
      setError('Company ID is required for employees');
      setIsLoading(false);
      return;
    }

    if (formData.userType === 'company') {
      if (!formData.companyName || !formData.companyEmail) {
        setError('Company name and email are required for company registration');
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        if (formData.userType === 'company') {
          setSuccess(`Company registration successful! Your Company ID is: ${data.companyId}. Save this ID for your employees to use when registering.`);
          setTimeout(() => {
            router.push('/Login');
          }, 5000);
        } else {
          setSuccess(data.message);
          // Show verification options for user accounts
          setTimeout(() => {
            setShowVerificationOptions(true);
          }, 2000);
        }
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNow = () => {
    router.push(`/Login/verify?email=${encodeURIComponent(formData.email)}`);
  };

  const handleVerifyLater = () => {
    router.push('/Login');
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <img src="/Assets/Title.png" alt="GO JOB" className="logo" />
        <h2 className="register-title">REGISTER</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <div className="user-type-toggle">
          <button 
            className={`toggle-btn ${formData.userType === 'job-seeker' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, userType: 'job-seeker'})}
          >
            Job Seeker
          </button>
          <button 
            className={`toggle-btn ${formData.userType === 'employee' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, userType: 'employee'})}
          >
            Employee
          </button>
        </div>

        <form onSubmit={handleRegister} className="register-form">
          {/* Personal Information Section */}
          <div className="section-title">Personal Information</div>
          
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="firstName">FIRST NAME</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="lastName">LAST NAME</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="middleName">MIDDLE NAME</label>
            <input
              type="text"
              id="middleName"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>

          {/* Personal Address Section */}
          <div className="section-title">Personal Address</div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="premiseName">BUILDING/PREMISE</label>
              <input
                type="text"
                id="premiseName"
                name="premiseName"
                value={formData.premiseName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
            <div className="input-group">
              <label htmlFor="streetName">STREET</label>
              <input
                type="text"
                id="streetName"
                name="streetName"
                value={formData.streetName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="barangayName">BARANGAY</label>
              <input
                type="text"
                id="barangayName"
                name="barangayName"
                value={formData.barangayName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
            <div className="input-group">
              <label htmlFor="cityName">CITY</label>
              <input
                type="text"
                id="cityName"
                name="cityName"
                value={formData.cityName}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>          <div className="input-group">
            <label htmlFor="nationalityName">NATIONALITY</label>
            <select
              id="nationalityName"
              name="nationalityName"
              value={formData.nationalityName}
              onChange={handleInputChange}
              required
            >
              {nationalities.map((nationality) => (
                <option key={nationality.nationality_id} value={nationality.nationality_name}>
                  {nationality.nationality_name}
                </option>
              ))}
            </select>
          </div>

          {/* Company-specific fields for employees */}
          {formData.userType === 'employee' && (
            <div>
              <div className="section-title">Company Information</div>
              <div className="input-group">
                <label htmlFor="companyId">COMPANY ID</label>
                <input
                  type="number"
                  id="companyId"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleInputChange}
                  placeholder="Enter Company ID (e.g., 1, 2, 3...)"
                  required
                />
                <small className="input-help">
                  Ask your employer for the Company ID to join their organization
                </small>
              </div>
            </div>
          )}

          {/* Account Information Section */}
          <div className="section-title">Account Information</div>
          
          <div className="input-group">
            <label htmlFor="email">EMAIL</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="username">USERNAME</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="phone">PHONE</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="password">PASSWORD</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'REGISTER'}
          </button>
        </form>

        {/* Verification Options Modal */}
        {showVerificationOptions && (
          <div className="verification-modal">
            <div className="verification-modal-content">
              <h3>Account Created Successfully!</h3>
              <p>A verification email has been sent to <strong>{formData.email}</strong></p>
              <p>Would you like to verify your email now or later?</p>
              
              <div className="verification-options">
                <button 
                  className="verify-now-btn"
                  onClick={handleVerifyNow}
                >
                  Verify Now
                </button>
                <button 
                  className="verify-later-btn"
                  onClick={handleVerifyLater}
                >
                  Verify Later
                </button>
              </div>
              
              <p className="verification-note">
                You can verify your email anytime from your profile page.
              </p>
            </div>
          </div>
        )}

        <div className="register-company-section">
          <span>Want to register your company?</span>
          <button 
            type="button" 
            className="company-register-btn"
            onClick={() => router.push('/Login/Register/Company')}
          >
            Register Your Company
          </button>
        </div>

        <div className="login-section">
          <span>Already have an account?</span>
          <button 
            type="button" 
            className="login-link-btn"
            onClick={() => router.push('/Login')}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
