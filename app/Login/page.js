'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [userType, setUserType] = useState('2'); // Default to Jobseeker
  const [theme, setTheme] = useState('jobseeker'); // Default theme
  const [credentials, setCredentials] = useState({
    usernameOrEmail: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    // Set the data-theme attribute on the HTML element based on the selected theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          accountType: userType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // After successful login, check account_is_verified
        let checkProfileUrl = '';
        let isEmployee = userType === '1';
        if (isEmployee) {
          checkProfileUrl = `/api/employee/profile?accountId=${data.accountId}`;
        } else {
          checkProfileUrl = `/api/jobseeker/profile?accountId=${data.accountId}`;
        }
        fetch(checkProfileUrl)
          .then(res => res.json())
          .then(profileData => {
            if (
              profileData.success &&
              profileData.data.account &&
              typeof profileData.data.account.account_is_verified !== 'undefined'
            ) {
              if (profileData.data.account.account_is_verified) {
                // Verified: normal login verification (send login verification email to own account)
                router.push(`/Login/Verification/Login?accountId=${data.accountId}`);
              } else {
                // Not verified: registration verification
                if (isEmployee) {
                  // Employee: verification sent to company email
                  router.push(`/Login/Verification/Registration?accountId=${data.accountId}&type=employee`);
                } else {
                  // Jobseeker: verification sent to own email
                  router.push(`/Login/Verification/Registration?accountId=${data.accountId}`);
                }
              }
            } else {
              setError('Unable to verify account status. Please try again or contact support.');
            }
          })
          .catch(() => {
            setError('Unable to verify account status. Please try again or contact support.');
          });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-24 w-auto mb-4">
            <Image
              src="/Assets/Title.png"
              alt="GoJob Logo"
              width={200}
              height={96}
              className="mx-auto"
              priority
            />
          </div>
          <h2 className="text-3xl font-bold text-[var(--foreground)]">Welcome Back</h2>
          <p className="mt-2 text-[var(--text-light)]">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* User Type Selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserType('1');
                    setTheme('employee');
                  }}
className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
  userType === '1'
    ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-[#fff]'
        : 'border-[var(--primary-color)] bg-[var(--light-color)] text-[#222831]')
    : 'border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] hover:border-[var(--hover-color)]'
}`}
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserType('2');
                    setTheme('jobseeker');
                  }}
className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
  userType === '2'
    ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'border-[var(--primary-color)] bg-[var(--primary-color)] text-[#fff]'
        : 'border-[var(--primary-color)] bg-[var(--light-color)] text-[#222831]')
    : 'border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] hover:border-[var(--hover-color)]'
}`}
                >
                  Jobseeker
                </button>
              </div>
            </div>

            {/* Username/Email Input */}
            <div>
                <label htmlFor="usernameOrEmail" className="block text-sm font-medium text-[var(--foreground)]">
                  Username or Email
                </label>
              <input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                required
                value={credentials.usernameOrEmail}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-[var(--border-color)] rounded-md shadow-sm placeholder-[var(--text-light)] focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
                placeholder="Enter your username or email"
              />
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                  Password
                </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-[var(--border-color)] rounded-md shadow-sm placeholder-[var(--text-light)] focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-light)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[var(--error-color)] text-sm bg-[rgba(231, 76, 60, 0.1)] border border-[var(--error-color)] rounded-md p-3">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/Login/ForgotPassword')}
                className="w-full text-center text-sm text-[var(--primary-color)] hover:text-[var(--secondary-color)] font-medium"
              >
                Forgot your password?
              </button>
              
              <div className="text-center">
                <span className="text-sm text-[var(--text-light)]">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => router.push('/Login/Register')}
                  className="text-sm font-medium text-[var(--primary-color)] hover:text-[var(--secondary-color)]"
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
