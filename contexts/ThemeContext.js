import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const themes = {
  dark: {
    name: 'dark',
    colors: {
      primary: '#64b5f6',
      primaryHover: '#42a5f5',
      secondary: '#1e88e5',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      cardBackground: 'rgba(30, 41, 59, 0.95)',
      inputBackground: 'rgba(30, 41, 59, 0.8)',
      text: '#e0e6ed',
      textSecondary: '#94a3b8',
      border: 'rgba(100, 181, 246, 0.3)',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
    }
  },
  light: {
    name: 'light',
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      secondary: '#3b82f6',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      cardBackground: 'rgba(255, 255, 255, 0.95)',
      inputBackground: 'rgba(255, 255, 255, 0.9)',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: 'rgba(37, 99, 235, 0.3)',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#d97706',
    }
  },
  ocean: {
    name: 'ocean',
    colors: {
      primary: '#06b6d4',
      primaryHover: '#0891b2',
      secondary: '#0e7490',
      background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
      cardBackground: 'rgba(8, 145, 178, 0.15)',
      inputBackground: 'rgba(8, 145, 178, 0.1)',
      text: '#f0f9ff',
      textSecondary: '#bae6fd',
      border: 'rgba(6, 182, 212, 0.4)',
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
    }
  },
  purple: {
    name: 'purple',
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      secondary: '#6d28d9',
      background: 'linear-gradient(135deg, #581c87 0%, #6b21a8 50%, #7c2d12 100%)',
      cardBackground: 'rgba(139, 92, 246, 0.15)',
      inputBackground: 'rgba(139, 92, 246, 0.1)',
      text: '#faf5ff',
      textSecondary: '#ddd6fe',
      border: 'rgba(139, 92, 246, 0.4)',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#f59e0b',
    }
  },
  cyberpunk: {
    name: 'cyberpunk',
    colors: {
      primary: '#ff00ff',
      primaryHover: '#e600e6',
      secondary: '#00ffff',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #330066 100%)',
      cardBackground: 'rgba(255, 0, 255, 0.1)',
      inputBackground: 'rgba(0, 255, 255, 0.05)',
      text: '#00ff00',
      textSecondary: '#ff00ff',
      border: 'rgba(255, 0, 255, 0.5)',
      error: '#ff0040',
      success: '#00ff80',
      warning: '#ffff00',
    }
  },
  sunset: {
    name: 'sunset',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      secondary: '#dc2626',
      background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
      cardBackground: 'rgba(249, 115, 22, 0.15)',
      inputBackground: 'rgba(249, 115, 22, 0.1)',
      text: '#fef2f2',
      textSecondary: '#fed7aa',
      border: 'rgba(249, 115, 22, 0.4)',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#eab308',
    }
  },
  forest: {
    name: 'forest',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      secondary: '#15803d',
      background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
      cardBackground: 'rgba(34, 197, 94, 0.15)',
      inputBackground: 'rgba(34, 197, 94, 0.1)',
      text: '#f0fdf4',
      textSecondary: '#bbf7d0',
      border: 'rgba(34, 197, 94, 0.4)',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#f59e0b',
    }
  },
  midnight: {
    name: 'midnight',
    colors: {
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      secondary: '#8b5cf6',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      cardBackground: 'rgba(99, 102, 241, 0.1)',
      inputBackground: 'rgba(99, 102, 241, 0.05)',
      text: '#e2e8f0',
      textSecondary: '#94a3b8',
      border: 'rgba(99, 102, 241, 0.3)',
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
    }
  },
  rose: {
    name: 'rose',
    colors: {
      primary: '#f43f5e',
      primaryHover: '#e11d48',
      secondary: '#ec4899',
      background: 'linear-gradient(135deg, #4c1d95 0%, #7c2d12 50%, #991b1b 100%)',
      cardBackground: 'rgba(244, 63, 94, 0.15)',
      inputBackground: 'rgba(244, 63, 94, 0.1)',
      text: '#fdf2f8',
      textSecondary: '#fbbf24',
      border: 'rgba(244, 63, 94, 0.4)',
      error: '#dc2626',
      success: '#059669',
      warning: '#d97706',
    }
  },
  arctic: {
    name: 'arctic',
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      secondary: '#06b6d4',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      cardBackground: 'rgba(255, 255, 255, 0.8)',
      inputBackground: 'rgba(255, 255, 255, 0.9)',
      text: '#0f172a',
      textSecondary: '#475569',
      border: 'rgba(14, 165, 233, 0.3)',
      error: '#dc2626',
      success: '#059669',
      warning: '#d97706',
    }
  },
  neon: {
    name: 'neon',
    colors: {
      primary: '#00ff88',
      primaryHover: '#00e676',
      secondary: '#ff0080',
      background: 'linear-gradient(135deg, #000000 0%, #1a0033 50%, #330066 100%)',
      cardBackground: 'rgba(0, 255, 136, 0.1)',
      inputBackground: 'rgba(0, 255, 136, 0.05)',
      text: '#00ff88',
      textSecondary: '#ff0080',
      border: 'rgba(0, 255, 136, 0.5)',
      error: '#ff0040',
      success: '#00ff88',
      warning: '#ffff00',
    }
  },
  autumn: {
    name: 'autumn',
    colors: {
      primary: '#ea580c',
      primaryHover: '#dc2626',
      secondary: '#d97706',
      background: 'linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #92400e 100%)',
      cardBackground: 'rgba(234, 88, 12, 0.15)',
      inputBackground: 'rgba(234, 88, 12, 0.1)',
      text: '#fef3c7',
      textSecondary: '#fed7aa',
      border: 'rgba(234, 88, 12, 0.4)',
      error: '#dc2626',
      success: '#059669',
      warning: '#d97706',
    }
  },
  monochrome: {
    name: 'monochrome',
    colors: {
      primary: '#374151',
      primaryHover: '#1f2937',
      secondary: '#6b7280',
      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #e5e7eb 100%)',
      cardBackground: 'rgba(255, 255, 255, 0.9)',
      inputBackground: 'rgba(255, 255, 255, 0.95)',
      text: '#111827',
      textSecondary: '#6b7280',
      border: 'rgba(55, 65, 81, 0.3)',
      error: '#374151',
      success: '#374151',
      warning: '#6b7280',
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set theme data attribute on body for theme-specific styles
    document.body.setAttribute('data-theme', currentTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    currentTheme,
    theme: themes[currentTheme],
    themes: Object.keys(themes),
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
