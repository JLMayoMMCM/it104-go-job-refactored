'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function GuestLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Set theme based on jobseeker theme
    document.documentElement.setAttribute('data-theme', 'jobseeker');
    
    // Set dark/light mode based on user preference or system setting
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
  }, []);

  return (
    <div className="min-h-screen w-full bg-[var(--background)] transition-all duration-300">
      {/* Header */}
      <header className="w-full bg-[var(--card-background)] shadow-sm border-b border-[var(--border-color)] sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <div
              onClick={() => router.push('/')}
              className="cursor-pointer"
            >
              <Image
                src="/Assets/Title.png"
                alt="GoJob Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </div>
          </div>

          {/* Right side - Login button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/Login')}
              className="btn btn-primary"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
} 