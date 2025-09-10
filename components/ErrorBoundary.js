import React from 'react';
import { logger } from '../utils/logger';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorId
    });

    // Enhanced logging with logger utility
    logger.error('ErrorBoundary', 'Component error caught', {
      errorId,
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      props: this.props,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Track error frequency for potential memory leaks or recurring issues
    const errorKey = `${error.name}_${error.message}`;
    const errorCount = parseInt(localStorage.getItem(`error_count_${errorKey}`) || '0') + 1;
    localStorage.setItem(`error_count_${errorKey}`, errorCount.toString());
    
    if (errorCount > 5) {
      logger.warn('ErrorBoundary', 'Recurring error detected', {
        errorKey,
        count: errorCount,
        errorId
      });
    }

    // In development, also log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary - ${errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Report to global error handler if available
    if (window.logReactError) {
      window.logReactError(error, errorInfo);
    }
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    logger.info('ErrorBoundary', 'User initiated retry', {
      errorId: this.state.errorId,
      retryCount: newRetryCount,
      previousError: this.state.error?.message
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: newRetryCount
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, retryCount } = this.state;
      const maxRetries = 3;
      
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">🚨</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              We encountered an unexpected error. Your data is safe.
            </p>
            
            {errorId && (
              <div className="error-id">
                <small>Error ID: {errorId}</small>
              </div>
            )}
            
            <div className="error-actions">
              {retryCount < maxRetries && (
                <button 
                  onClick={this.handleRetry}
                  className="btn btn-primary error-retry-btn"
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-secondary error-reload-btn"
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Developer Details</summary>
                <div className="error-info">
                  <h4>Error:</h4>
                  <pre>{error && error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{errorInfo && errorInfo.componentStack}</pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre>{error && error.stack}</pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
