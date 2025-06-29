'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect } from 'react';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Set theme to 'logo' for this page, which is a teal-based theme
    document.documentElement.setAttribute('data-theme', 'logo');
    
    // Set dark/light mode from localStorage or system preference
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode) {
      document.documentElement.setAttribute('data-mode', savedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
    }
  }, []);

  const handleLoginRedirect = () => {
    router.push('/Login');
  };

  const Card = ({ icon, title, description }) => (
    <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] flex flex-col items-center text-center transform hover:-translate-y-2 transition-transform duration-300">
      <div className="text-[var(--primary-color)] mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-[var(--text-light)] text-sm">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 sm:p-8">
      <main className="max-w-4xl w-full text-center">
        
        {/* Logo and Header */}
        <div className="mb-12">
          <div className="relative w-64 h-64 mx-auto mb-6">
            <Image
              src="/Assets/Logo.png"
              alt="GoJob Logo"
              fill
              className="rounded-full shadow-lg object-cover"
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] tracking-tight">
            Welcome to <span className="text-[var(--primary-color)]">GoJob</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--text-light)] max-w-2xl mx-auto">
            Your one-stop platform for discovering career opportunities and connecting with top talent.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            title="Apply for Jobs"
            description="Explore thousands of job listings tailored to your skills and preferences. Find your next career move with ease."
          />
          <Card
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
            title="Create Jobs"
            description="Attract the best candidates by posting job openings. Manage applications and build your dream team effortlessly."
          />
          <Card
            icon={<svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            title="Connect with People"
            description="Network with professionals, follow top companies, and stay updated on industry trends to grow your career."
          />
        </div>

        {/* Login Button */}
        <div>
          <button
            onClick={handleLoginRedirect}
            className="px-8 py-3 bg-[var(--primary-color)] text-[var(--button-text)] font-bold text-lg rounded-full shadow-lg hover:bg-[var(--primary-color-hover)] transform hover:scale-105 transition-all duration-300"
          >
            Get Started
          </button>
        </div>
        
      </main>
    </div>
  );
}
