'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect } from 'react';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Set the data-theme and data-mode attributes on the HTML element (dashboard logic)
    document.documentElement.setAttribute('data-theme', 'jobseeker');
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode) {
      document.documentElement.setAttribute('data-mode', savedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
    }
  }, []);

  const handleLoginClick = () => {
    router.push('/Login');
  };

  const handleViewJobsClick = () => {
    // Placeholder - no action for now
    console.log('View Jobs clicked - placeholder functionality');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        color: 'var(--foreground)',
        transition: 'background 0.3s, color 0.3s'
      }}
    >
      <div className="max-w-4xl w-full text-center space-y-12">
        {/* Logo Section */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <Image
              src="/Assets/Logo.png"
              alt="GoJob Logo"
              width={300}
              height={300}
              className="mx-auto drop-shadow-lg"
              priority
            />
          </div>
          
          {/* Welcome Text */}
          <div className="space-y-4">
            <h1
              className="text-5xl md:text-6xl font-bold text-heading"
              style={{
                background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--accent-color))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                letterSpacing: '0.02em'
              }}
            >
              Welcome to <span style={{
                color: 'var(--primary-color)',
                background: 'none',
                WebkitBackgroundClip: 'initial',
                WebkitTextFillColor: 'initial'
              }}>GoJob</span>
            </h1>
            <p
              className="text-xl md:text-2xl text-subheading max-w-2xl mx-auto leading-relaxed"
              style={{
                color: 'var(--text-light)'
              }}
            >
              Your gateway to finding the perfect job opportunities and connecting with top talent
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-md mx-auto">
          <button
            onClick={handleViewJobsClick}
            className="btn btn-primary min-w-[8rem] text-lg text-white"
          >
            View Jobs
          </button>
          
          <button
            onClick={handleLoginClick}
            className="btn btn-primary min-w-[8rem] text-lg text-white"
          >
            Login
          </button>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div
            className="card-uniform p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            style={{
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'var(--primary-color)'
              }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--foreground)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Find Jobs</h3>
            <p style={{ color: 'var(--text-light)' }}>Discover opportunities that match your skills and career goals</p>
          </div>

          <div
            className="card-uniform p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            style={{
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'var(--secondary-color)'
              }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--foreground)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Connect</h3>
            <p style={{ color: 'var(--text-light)' }}>Build professional relationships with employers and colleagues</p>
          </div>

          <div
            className="card-uniform p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            style={{
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'var(--accent-color)'
              }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--foreground)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Grow</h3>
            <p style={{ color: 'var(--text-light)' }}>Advance your career with the right opportunities and resources</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm" style={{ color: 'var(--text-light)' }}>
          <p>© 2024 GoJob. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
