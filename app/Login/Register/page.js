'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RegisterSelectorPage() {
  const router = useRouter();

  const registrationOptions = [
    {
      type: 'Jobseeker',
      description: 'Looking for your next career opportunity',
      icon: (
        <svg className="w-12 h-12 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      route: '/Login/Register/Jobseeker'
    },
    {
      type: 'Employee',
      description: 'Representing your company in hiring',
      icon: (
        <svg className="w-12 h-12 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
        </svg>
      ),
      route: '/Login/Register/Employee'
    },
    {
      type: 'Company',
      description: 'Register your organization',
      icon: (
        <svg className="w-12 h-12 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      route: '/Login/Register/Company'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-24 w-auto mb-6">
            <Image
              src="/Assets/Title.png"
              alt="GoJob Logo"
              width={200}
              height={96}
              className="mx-auto"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-[var(--foreground)]">Join GoJob</h1>
          <p className="mt-3 text-lg text-[var(--text-light)]">Choose your registration type to get started</p>
        </div>

        {/* Registration Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {registrationOptions.map((option) => (
            <div key={option.type} className="bg-[var(--card-background)] rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <button
                onClick={() => router.push(option.route)}
                className="w-full p-8 text-center hover:bg-[rgba(128, 128, 128, 0.05)] rounded-xl transition-colors duration-200"
              >
                <div className="flex justify-center mb-4">
                  {option.icon}
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                  {option.type}
                </h3>
                <p className="text-[var(--text-light)] text-sm leading-relaxed">
                  {option.description}
                </p>
              </button>
            </div>
          ))}
        </div>

        {/* Back to Login */}
        <div className="text-center mt-8">
          <p className="text-[var(--text-light)]">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/Login')}
              className="text-[var(--primary-color)] hover:text-[var(--secondary-color)] font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
