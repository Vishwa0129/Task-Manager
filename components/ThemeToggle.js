import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { currentTheme, themes, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeIcons = {
    dark: '🌙',
    light: '☀️',
    ocean: '🌊',
    sunset: '🌅',
    forest: '🌲'
  };

  const themeNames = {
    dark: 'Dark',
    light: 'Light',
    ocean: 'Ocean',
    sunset: 'Sunset',
    forest: 'Forest'
  };

  const handleThemeChange = (theme) => {
    changeTheme(theme);
    setIsOpen(false);
  };

  return (
    <div className="theme-toggle-container">
      <button
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
        aria-expanded={isOpen}
      >
        <span className="theme-icon">{themeIcons[currentTheme]}</span>
        <span className="theme-name">{themeNames[currentTheme]}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown">
          {themes.map((theme) => (
            <button
              key={theme}
              className={`theme-option ${theme === currentTheme ? 'active' : ''}`}
              onClick={() => handleThemeChange(theme)}
            >
              <span className="theme-icon">{themeIcons[theme]}</span>
              <span className="theme-name">{themeNames[theme]}</span>
              {theme === currentTheme && <span className="check-mark">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
