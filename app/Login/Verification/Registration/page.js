'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Loading component that matches the page design
function VerificationPageLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
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
          <h2 className="text-3xl font-bold text-[var(--foreground)]">Loading...</h2>
          <p className="mt-2 text-[var(--text-light)] text-sm">
            Please wait while we prepare your verification page.
          </p>
        </div>
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-[var(--input-background)] rounded w-1/3"></div>
            <div className="h-12 bg-[var(--input-background)] rounded"></div>
            <div className="h-10 bg-[var(--input-background)] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component that uses useSearchParams - will be wrapped in Suspense
function VerificationContent() {
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
        const successUrl = type === 'company' ? '/Login?verified=company' : '/Login?verified=success';
        router.push(successUrl);
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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
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
          <h2 className="text-3xl font-bold text-[var(--foreground)]">{getPageTitle()}</h2>
          <p className="mt-2 text-[var(--text-light)] text-sm">
            {getVerificationMessage()}
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <form className="space-y-6" onSubmit={handleVerification}>
            {/* Verification Code Input */}
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-[var(--foreground)] mb-2">
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
                className="block w-full px-4 py-3 text-center text-2xl font-bold border border-[var(--border-color)] bg-[var(--input-background)] rounded-md shadow-sm placeholder-[var(--text-light)] focus:outline-none focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] tracking-widest"
                placeholder="000000"
              />
              <p className="mt-1 text-xs text-[var(--text-light)]">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--button-text)] bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Account'}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-[var(--text-light)]">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || isResending}
                  className="font-medium text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] focus:outline-none disabled:text-[var(--text-light)] disabled:cursor-not-allowed transition-colors"
                >
                  {isResending
                    ? 'Sending...'
                    : resendTimer > 0
                    ? `Resend in ${resendTimer}s`
                    : 'Resend code'}
                </button>
              </p>
            </div>
          </form>
        </div>

        <div className="text-center">
          <button onClick={() => router.push('/Login')} className="text-sm text-[var(--text-light)] hover:text-[var(--foreground)] transition-colors">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function RegistrationVerificationPage() {
  return (
    <Suspense fallback={<VerificationPageLoading />}>
      <VerificationContent />
    </Suspense>
  );
}
