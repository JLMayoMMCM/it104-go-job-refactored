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
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: "url('/Assets/welcome-bg.png')", opacity: 1 }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
        
        {/* Logo and Title */}
        <div 
          className="flex flex-col items-center justify-center p-8 rounded-lg transition-all duration-500"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(0.25rem)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
          }}
        >
          <img src="/Assets/Logo.png" alt="GoJob Logo" className="w-24 h-24 mb-4" />
          <img src="/Assets/Title.png" alt="GoJob Title" className="w-48" />
        </div>

        {/* Buttons */}
        <div className="mt-12 space-y-4 md:space-y-0 md:space-x-6 flex flex-col md:flex-row">
          <button
            onClick={handleJobseekerClick}
            className="btn-welcome"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(0.25rem)'
            }}
          >
            <span className="text-2xl mr-4">🧑‍💼</span>
            <div>
              <p className="font-bold text-xl">Find a Job</p>
              <p className="text-sm opacity-80">I am a Jobseeker</p>
            </div>
          </button>
          <button
            onClick={handleEmployeeClick}
            className="btn-welcome"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(0.25rem)'
            }}
          >
            <span className="text-2xl mr-4">🏢</span>
            <div>
              <p className="font-bold text-xl">Hire Talent</p>
              <p className="text-sm opacity-80">I am an Employer</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
