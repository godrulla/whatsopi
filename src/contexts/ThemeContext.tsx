import React, { createContext, useContext, useEffect, useState } from 'react';

// Dominican-inspired theme colors
interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface Theme {
  name: 'light' | 'dark';
  colors: ThemeColors;
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Dominican flag colors as inspiration
const dominicanBlue = '#1B73E8'; // Dominican blue
const dominicanRed = '#DC2626';  // Dominican red
const dominicanWhite = '#FFFFFF';

const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: {
      50: '#EBF4FF',
      100: '#D1E9FF',
      200: '#B3DCFF',
      300: '#85C5FF',
      400: '#5BA3FF',
      500: dominicanBlue, // #1B73E8
      600: '#1557B0',
      700: '#0F3F7A',
      800: '#0A2A52',
      900: '#051829',
    },
    secondary: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: dominicanRed, // #DC2626
      600: '#B91C1C',
      700: '#991B1B',
      800: '#7F1D1D',
      900: '#651A1A',
    },
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
};

const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: {
      50: '#051829',
      100: '#0A2A52',
      200: '#0F3F7A',
      300: '#1557B0',
      400: '#1B73E8',
      500: '#5BA3FF',
      600: '#85C5FF',
      700: '#B3DCFF',
      800: '#D1E9FF',
      900: '#EBF4FF',
    },
    secondary: {
      50: '#651A1A',
      100: '#7F1D1D',
      200: '#991B1B',
      300: '#B91C1C',
      400: '#DC2626',
      500: '#F87171',
      600: '#FCA5A5',
      700: '#FECACA',
      800: '#FEE2E2',
      900: '#FEF2F2',
    },
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('whatsopi-theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const setTheme = (themeName: 'light' | 'dark') => {
    setIsDark(themeName === 'dark');
  };

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('whatsopi-theme', isDark ? 'dark' : 'light');

    // Update document class and CSS variables
    document.documentElement.classList.toggle('dark', isDark);
    
    // Set CSS custom properties for theme colors
    const root = document.documentElement;
    const colors = theme.colors;

    // Primary colors
    root.style.setProperty('--color-primary-50', colors.primary[50]);
    root.style.setProperty('--color-primary-100', colors.primary[100]);
    root.style.setProperty('--color-primary-200', colors.primary[200]);
    root.style.setProperty('--color-primary-300', colors.primary[300]);
    root.style.setProperty('--color-primary-400', colors.primary[400]);
    root.style.setProperty('--color-primary-500', colors.primary[500]);
    root.style.setProperty('--color-primary-600', colors.primary[600]);
    root.style.setProperty('--color-primary-700', colors.primary[700]);
    root.style.setProperty('--color-primary-800', colors.primary[800]);
    root.style.setProperty('--color-primary-900', colors.primary[900]);

    // Secondary colors
    root.style.setProperty('--color-secondary-50', colors.secondary[50]);
    root.style.setProperty('--color-secondary-100', colors.secondary[100]);
    root.style.setProperty('--color-secondary-200', colors.secondary[200]);
    root.style.setProperty('--color-secondary-300', colors.secondary[300]);
    root.style.setProperty('--color-secondary-400', colors.secondary[400]);
    root.style.setProperty('--color-secondary-500', colors.secondary[500]);
    root.style.setProperty('--color-secondary-600', colors.secondary[600]);
    root.style.setProperty('--color-secondary-700', colors.secondary[700]);
    root.style.setProperty('--color-secondary-800', colors.secondary[800]);
    root.style.setProperty('--color-secondary-900', colors.secondary[900]);

    // Semantic colors
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-info', colors.info);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary[500]);
    }

    // Update status bar style for iOS
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      metaStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }, [isDark, theme]);

  const value: ThemeContextValue = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export theme objects for use in other components
export { lightTheme, darkTheme };
export type { Theme, ThemeColors };