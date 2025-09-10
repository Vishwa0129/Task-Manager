import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ImprovedHome from './components/ImprovedHome';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ThemeToggle from './components/ThemeToggle';
import { globalErrorHandler } from './utils/globalErrorHandler';
import './components/ErrorBoundary.css';
import './styles/enhanced.css';
import './styles/themes.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);

  // Load user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Initialize global error handling
    globalErrorHandler.initialize();
  }, []);

  // Handle navigation
  const handleNavigation = useCallback((page) => {
    setCurrentPage(page);
    // Update URL hash for better UX
    window.location.hash = page;
  }, []);

  // Handle sign in
  const handleSignIn = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('home');
    window.location.hash = 'home';
  }, []);

  // Handle sign up
  const handleSignUp = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('home');
    window.location.hash = 'home';
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    setCurrentPage('home');
    window.location.hash = 'home';
  }, []);

  // Handle hash change for browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentPage(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Set initial page

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Render current page
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'signin':
        return <SignIn onSignIn={handleSignIn} />;
      case 'signup':
        return <SignUp onSignUp={handleSignUp} />;
      case 'home':
      default:
        return <ImprovedHome />;
    }
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <div className="App">
          {/* Navigation Bar */}
          <nav className="navbar" role="navigation" aria-label="Main navigation">
            <div className="nav-container">
              <div className="nav-brand">
                <h2>📋 TaskFlow</h2>
              </div>
              <div className="nav-links">
                <ThemeToggle />
                <button 
                  onClick={() => handleNavigation('home')}
                  className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
                  aria-current={currentPage === 'home' ? 'page' : undefined}
                >
                  Home
                </button>
                {user ? (
                  <>
                    <span className="user-welcome">Welcome, {user.name}!</span>
                    <button 
                      onClick={handleSignOut}
                      className="nav-link signout-btn"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleNavigation('signin')}
                      className={`nav-link ${currentPage === 'signin' ? 'active' : ''}`}
                      aria-current={currentPage === 'signin' ? 'page' : undefined}
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => handleNavigation('signup')}
                      className={`nav-link ${currentPage === 'signup' ? 'active' : ''}`}
                      aria-current={currentPage === 'signup' ? 'page' : undefined}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="main-content">
            <ErrorBoundary>
              {renderCurrentPage()}
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="footer">
            <p>Built with React • Data saved locally</p>
            <p className="credit">Built by <span className="author">Vishwa Teja</span></p>
          </footer>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
