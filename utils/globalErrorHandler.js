// Global Error Handler for comprehensive error tracking and reporting
import { logger } from './logger';
import { performanceMonitor } from './enhancedPerformance';

class GlobalErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.isInitialized = false;
    this.errorStats = {
      totalErrors: 0,
      jsErrors: 0,
      promiseRejections: 0,
      resourceErrors: 0,
      networkErrors: 0
    };
  }

  // Initialize global error handling
  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Handle JavaScript errors
    window.addEventListener('error', this.handleJavaScriptError.bind(this));

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));

    // Handle resource loading errors
    window.addEventListener('error', this.handleResourceError.bind(this), true);

    // Handle network errors (fetch failures)
    this.interceptFetch();

    // Set up React error reporting
    window.logReactError = this.handleReactError.bind(this);

    this.isInitialized = true;
    logger.info('GlobalErrorHandler', 'Global error handling initialized');
  }

  // Handle JavaScript runtime errors
  handleJavaScriptError(event) {
    try {
      const error = {
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      this.errorStats.jsErrors++;
      this.errorStats.totalErrors++;

      this.queueError(error);
      
      logger.error('GlobalErrorHandler', 'JavaScript error caught', error);

      // Performance impact tracking
      performanceMonitor.startMeasure('error-handling');
      performanceMonitor.endMeasure('error-handling');

    } catch (handlerError) {
      console.error('Error in JavaScript error handler:', handlerError);
    }
  }

  // Handle unhandled promise rejections
  handlePromiseRejection(event) {
    try {
      const error = {
        type: 'promise-rejection',
        reason: event.reason?.toString() || 'Unknown promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      this.errorStats.promiseRejections++;
      this.errorStats.totalErrors++;

      this.queueError(error);
      
      logger.error('GlobalErrorHandler', 'Unhandled promise rejection', error);

      // Prevent the default browser behavior
      event.preventDefault();

    } catch (handlerError) {
      console.error('Error in promise rejection handler:', handlerError);
    }
  }

  // Handle resource loading errors
  handleResourceError(event) {
    try {
      if (event.target === window) return; // Skip window errors (handled by handleJavaScriptError)

      const error = {
        type: 'resource',
        element: event.target.tagName,
        source: event.target.src || event.target.href,
        message: `Failed to load ${event.target.tagName.toLowerCase()}`,
        timestamp: Date.now(),
        url: window.location.href
      };

      this.errorStats.resourceErrors++;
      this.errorStats.totalErrors++;

      this.queueError(error);
      
      logger.error('GlobalErrorHandler', 'Resource loading error', error);

    } catch (handlerError) {
      console.error('Error in resource error handler:', handlerError);
    }
  }

  // Handle React component errors
  handleReactError(error, errorInfo) {
    try {
      const reactError = {
        type: 'react',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      this.errorStats.totalErrors++;
      this.queueError(reactError);
      
      logger.error('GlobalErrorHandler', 'React component error', reactError);

    } catch (handlerError) {
      console.error('Error in React error handler:', handlerError);
    }
  }

  // Intercept fetch to catch network errors
  interceptFetch() {
    try {
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          
          // Log failed HTTP requests
          if (!response.ok) {
            const networkError = {
              type: 'network',
              url: args[0],
              status: response.status,
              statusText: response.statusText,
              message: `HTTP ${response.status}: ${response.statusText}`,
              timestamp: Date.now()
            };

            this.errorStats.networkErrors++;
            this.errorStats.totalErrors++;
            this.queueError(networkError);
            
            logger.warn('GlobalErrorHandler', 'HTTP error response', networkError);
          }
          
          return response;
        } catch (fetchError) {
          const networkError = {
            type: 'network',
            url: args[0],
            message: fetchError.message,
            stack: fetchError.stack,
            timestamp: Date.now()
          };

          this.errorStats.networkErrors++;
          this.errorStats.totalErrors++;
          this.queueError(networkError);
          
          logger.error('GlobalErrorHandler', 'Network fetch error', networkError);
          throw fetchError;
        }
      };
    } catch (interceptError) {
      console.error('Error setting up fetch interception:', interceptError);
    }
  }

  // Queue error for batch processing
  queueError(error) {
    try {
      this.errorQueue.push(error);
      
      // Maintain queue size limit
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue.shift();
      }

      // Auto-process critical errors immediately
      if (this.isCriticalError(error)) {
        this.processCriticalError(error);
      }

    } catch (queueError) {
      console.error('Error queuing error:', queueError);
    }
  }

  // Check if error is critical
  isCriticalError(error) {
    const criticalPatterns = [
      /memory/i,
      /out of memory/i,
      /maximum call stack/i,
      /script error/i,
      /network error/i
    ];

    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.reason)
    );
  }

  // Process critical errors immediately
  processCriticalError(error) {
    try {
      logger.critical('GlobalErrorHandler', 'Critical error detected', error);
      
      // Store critical error in localStorage for persistence
      const criticalErrors = JSON.parse(localStorage.getItem('criticalErrors') || '[]');
      criticalErrors.push({
        ...error,
        id: `critical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // Keep only last 10 critical errors
      if (criticalErrors.length > 10) {
        criticalErrors.splice(0, criticalErrors.length - 10);
      }
      
      localStorage.setItem('criticalErrors', JSON.stringify(criticalErrors));

    } catch (processError) {
      console.error('Error processing critical error:', processError);
    }
  }

  // Get error statistics
  getErrorStats() {
    return {
      ...this.errorStats,
      queueSize: this.errorQueue.length,
      criticalErrors: JSON.parse(localStorage.getItem('criticalErrors') || '[]').length
    };
  }

  // Get recent errors
  getRecentErrors(limit = 10) {
    return this.errorQueue.slice(-limit);
  }

  // Clear error queue
  clearErrorQueue() {
    this.errorQueue = [];
    logger.info('GlobalErrorHandler', 'Error queue cleared');
  }

  // Export error data
  exportErrors() {
    try {
      const errorData = {
        stats: this.getErrorStats(),
        recentErrors: this.errorQueue,
        criticalErrors: JSON.parse(localStorage.getItem('criticalErrors') || '[]'),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const blob = new Blob([JSON.stringify(errorData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('GlobalErrorHandler', 'Error report exported');
      return true;
    } catch (exportError) {
      logger.error('GlobalErrorHandler', 'Failed to export error report', { error: exportError });
      return false;
    }
  }

  // Reset error statistics
  resetStats() {
    this.errorStats = {
      totalErrors: 0,
      jsErrors: 0,
      promiseRejections: 0,
      resourceErrors: 0,
      networkErrors: 0
    };
    this.clearErrorQueue();
    localStorage.removeItem('criticalErrors');
    logger.info('GlobalErrorHandler', 'Error statistics reset');
  }
}

// Create global instance
export const globalErrorHandler = new GlobalErrorHandler();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalErrorHandler.initialize();
    });
  } else {
    globalErrorHandler.initialize();
  }
}

export default GlobalErrorHandler;
