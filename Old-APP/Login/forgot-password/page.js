'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../login.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState('email'); // 'email', 'verify', 'reset'
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Verification code sent to your email!');
        setStep('verify');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, code: verificationCode })
      });

      const data = await response.json();

      if (response.ok) {
        setStep('reset');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emailOrUsername, 
          code: verificationCode, 
          newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password reset successfully!');
        setTimeout(() => {
          router.push('/Login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendCode} className="login-form">
      <div className="input-group">
        <label htmlFor="emailOrUsername">EMAIL OR USERNAME</label>
        <input
          type="text"
          id="emailOrUsername"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          placeholder="Enter your email or username"
          required
        />
      </div>

      <div className="action-buttons">
        <button 
          type="button" 
          className="back-btn"
          onClick={() => router.push('/Login')}
        >
          BACK TO LOGIN
        </button>
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'SEND CODE'}
        </button>
      </div>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyCode} className="login-form">
      <div className="input-group">
        <label htmlFor="verificationCode">VERIFICATION CODE</label>
        <input
          type="text"
          id="verificationCode"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter the 6-digit code"
          required
          maxLength="6"
        />
      </div>

      <div className="action-buttons">
        <button 
          type="button" 
          className="back-btn"
          onClick={() => setStep('email')}
        >
          BACK
        </button>
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'VERIFY CODE'}
        </button>
      </div>
    </form>
  );

  const renderResetStep = () => (
    <form onSubmit={handleResetPassword} className="login-form">
      <div className="input-group">
        <label htmlFor="newPassword">NEW PASSWORD</label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          required
          minLength="6"
        />
      </div>

      <div className="input-group">
        <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          minLength="6"
        />
      </div>

      <div className="action-buttons">
        <button 
          type="button" 
          className="back-btn"
          onClick={() => setStep('verify')}
        >
          BACK
        </button>
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? 'Changing...' : 'CHANGE PASSWORD'}
        </button>
      </div>
    </form>
  );

  const getTitle = () => {
    switch (step) {
      case 'email': return 'FORGOT PASSWORD';
      case 'verify': return 'VERIFY CODE';
      case 'reset': return 'RESET PASSWORD';
      default: return 'FORGOT PASSWORD';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'email': return 'Enter your email or username to receive a verification code';
      case 'verify': return 'Enter the verification code sent to your email';
      case 'reset': return 'Create your new password';
      default: return '';
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/Assets/Title.png" alt="GO JOB" className="logo" />
        
        <h2 className="login-title">{getTitle()}</h2>
        <p className="login-subtitle">{getSubtitle()}</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {step === 'email' && renderEmailStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
      </div>

      <div className="support-section">
        <button className="support-btn">SUPPORT</button>
      </div>
    </div>
  );
}
