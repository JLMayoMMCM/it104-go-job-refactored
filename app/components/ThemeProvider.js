'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }) {
  const [themeInitialized, setThemeInitialized] = useState(false);

  useEffect(() => {
    // Check for saved theme in localStorage or use system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    // Apply the initial theme
    document.documentElement.setAttribute('data-mode', initialTheme);
    setThemeInitialized(true);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-mode', newTheme);
      localStorage.setItem('theme', newTheme);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Don't render children until theme is initialized to prevent flash of wrong theme
  if (!themeInitialized) {
    return null;
  }

  return <>{children}</>;
}
