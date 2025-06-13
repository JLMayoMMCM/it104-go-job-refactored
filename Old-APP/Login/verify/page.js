'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './verify.css';

// Force dynamic rendering to prevent static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
        if (response.ok) {
        // Store token
        localStorage.setItem('authToken', data.token);
        
        // Route based on account type
        if (data.user.isJobSeeker) {
          // Check if job seeker needs to set preferences
          if (!data.user.hasPreferences) {
            router.push('/job-preferences');
          } else {
            router.push('/jobseeker/dashboard');
          }
        } else if (data.user.isEmployee) {
          router.push('/employee/dashboard');
        } else {
          // Fallback to general dashboard
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.emailSimulated && data.code) {
          alert(`Verification code: ${data.code}\n\n(Email service is in simulation mode - in production, this would be sent to your email)`);
        } else if (data.emailSent) {
          alert('Verification code sent! Please check your email.');
        } else {
          alert('Verification code generated but email could not be sent. Please contact support.');
        }
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (error) {
      setError('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <img src="/Assets/Title.png" alt="GO JOB" className="logo" />
        <h2 className="verify-title">VERIFY EMAIL</h2>
        
        <p className="verify-description">
          We've sent a verification code to <strong>{email}</strong>
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleVerify} className="verify-form">
          <div className="input-group">
            <label htmlFor="code">VERIFICATION CODE</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength="6"
              required
            />
          </div>

          <button type="submit" className="verify-btn" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'VERIFY'}
          </button>        </form>

        <div className="resend-section">
          <span>Didn't receive the code?</span>
          <button 
            type="button" 
            className="resend-btn"
            onClick={handleResendCode}
            disabled={isResending}
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="verify-container">
      <div className="verify-form">
        <h2>Loading verification page...</h2>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
