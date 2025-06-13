'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function RegistrationVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const accountId = searchParams.get('accountId');
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type'); // 'jobseeker', 'employee', 'company'

  useEffect(() => {
    if (!accountId && !companyId) {
      router.push('/Login');
    }
  }, [accountId, companyId, router]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerification = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          accountId: accountId,
          companyId: companyId,
          type: type
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect based on type
        if (type === 'company') {
          router.push('/Login?verified=company');
        } else {
          router.push('/Login?verified=success');
        }
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setIsResending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          companyId: companyId,
          type: type
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendTimer(60); // 60 seconds cooldown
      } else {
        setError(data.message || 'Failed to resend code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const getVerificationMessage = () => {
    switch (type) {
      case 'jobseeker':
        return 'We\'ve sent a 6-digit verification code to your email address. Please enter it below to activate your jobseeker account.';
      case 'employee':
        return 'We\'ve sent a verification code to your company\'s email address. Please ask your HR department to provide you with the code.';
      case 'company':
        return 'We\'ve sent a 6-digit verification code to your company email address. Please enter it below to complete your company registration.';
      default:
        return 'Please enter the verification code sent to your email address.';
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case 'jobseeker':
        return 'Verify Your Account';
      case 'employee':
        return 'Employee Verification';
      case 'company':
        return 'Company Verification';
      default:
        return 'Email Verification';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
          <h2 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="mt-2 text-gray-600 text-sm">
            {getVerificationMessage()}
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleVerification}>
            {/* Verification Code Input */}
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                required
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                  setVerificationCode(value);
                  setError('');
                }}
                className="block w-full px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 tracking-widest"
                placeholder="000000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || isResending}
                  className="text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {isResending 
                    ? 'Sending...' 
                    : resendTimer > 0 
                      ? `Resend in ${resendTimer}s` 
                      : 'Resend Code'
                  }
                </button>
              </p>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/Login')}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        </div>

        {/* Additional Information */}
        {type === 'employee' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Waiting for Company Approval
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Your company's HR department has received the verification code. 
                    Please contact them to complete your registration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
