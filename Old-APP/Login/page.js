'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [userType, setUserType] = useState('job-seeker');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, userType })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.requiresVerification) {
          // Redirect to email verification page
          router.push(`/Login/verify?email=${encodeURIComponent(data.email)}`);
        } else {
          // User is verified, store token and redirect to dashboard
          localStorage.setItem('authToken', data.token);
          
          // Redirect based on user type
          if (userType === 'employee') {
            router.push('/employee/dashboard');
          } else {
            router.push('/jobseeker/dashboard');
          }
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleForgotPassword = () => {
    router.push('/Login/forgot-password');
  };

  const handleSignup = () => {
    router.push('/Login/Register');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/Assets/Title.png" alt="GO JOB" className="logo" />
        
        <h2 className="login-title">LOGIN</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="user-type-toggle">
          <button 
            className={`toggle-btn ${userType === 'job-seeker' ? 'active' : ''}`}
            onClick={() => setUserType('job-seeker')}
          >
            Job Seeker
          </button>
          <button 
            className={`toggle-btn ${userType === 'employee' ? 'active' : ''}`}
            onClick={() => setUserType('employee')}
          >
            Employee
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="username">USERNAME</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="action-buttons">
            <button 
              type="button" 
              className="forgot-password-btn"
              onClick={handleForgotPassword}
            >
              FORGOT PASSWORD ?
            </button>
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'LOGIN'}
            </button>
          </div>
        </form>

        <button 
          type="button" 
          className="google-login-btn"
          onClick={handleGoogleLogin}
        >
          Login with Google
        </button>

        <div className="signup-section">
          <span>New to Go-Job ?</span>
          <button 
            type="button" 
            className="signup-btn"
            onClick={handleSignup}
          >
            Sign-up
          </button>
        </div>
      </div>

      <div className="support-section">
        <button className="support-btn">SUPPORT</button>
      </div>
    </div>
  );
}