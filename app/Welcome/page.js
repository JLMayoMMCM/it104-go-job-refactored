'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect } from 'react';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'jobseeker');
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode) {
      document.documentElement.setAttribute('data-mode', savedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
    }
  }, []);

  const InfoCard = ({ title, description }) => (
    <div className="card h-full flex flex-col items-center text-center p-6 transform hover:-translate-y-2 transition-transform duration-300">
      <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{title}</h3>
      <p className="text-[var(--text-light)] text-sm flex-grow">{description}</p>
    </div>
  );

  return (
    <div className="h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4">
      <main className="max-w-4xl w-full text-center">
        
        {/* Logo and Header */}
        <div className="mb-10">
          <div className="relative w-48 h-48 mx-auto mb-4">
            <Image
              src="/Assets/Logo.png"
              alt="GoJob Logo"
              fill
              className="rounded-full shadow-lg object-cover"
              priority
            />
          </div>
          <h1 className="text-5xl font-extrabold text-[var(--foreground)] tracking-tight">
            Welcome to <span className="text-[var(--primary-color)]">GoJob</span>
          </h1>
          <p className="mt-3 text-lg text-[var(--text-light)] max-w-2xl mx-auto">
            Your one-stop platform for discovering career opportunities.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <InfoCard
            title="For Job Seekers"
            description="Build your profile, get discovered by top companies, and apply with one click."
          />
          <InfoCard
            title="For Employers"
            description="Post jobs, manage applicants, and find the perfect candidate for your team."
          />
          <InfoCard
            title="Match Qualifications"
            description="Our smart algorithm matches you with jobs that fit your qualifications and preferences."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center space-x-4">
            <Link href="/guest/jobs/all" passHref>
                <button
                    className="btn btn-primary px-8 py-3 text-lg font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 w-48"
                >
                    View Jobs
                </button>
            </Link>
            <Link href="/Login" passHref>
                <button
                    className="btn btn-secondary px-8 py-3 text-lg font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 w-48"
                >
                    Login
                </button>
            </Link>
        </div>
        
      </main>
    </div>
  );
}
