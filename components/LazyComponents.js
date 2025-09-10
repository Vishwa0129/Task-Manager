// Lazy loading components for better performance
import React, { Suspense, lazy } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Loading component
const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  </div>
);

// Lazy loaded components
const LazyProgressTracker = lazy(() => 
  import('./ProgressTracker').then(module => ({
    default: module.default
  }))
);

const LazyTaskExporter = lazy(() => 
  import('./TaskExporter').then(module => ({
    default: module.default
  }))
);

const LazyTaskImporter = lazy(() => 
  import('./TaskImporter').then(module => ({
    default: module.default
  }))
);

const LazyAnalyticsDashboard = lazy(() => 
  import('./AnalyticsDashboard').then(module => ({
    default: module.default
  }))
);

// Higher-order component for lazy loading with error boundary
const withLazyLoading = (Component, fallback = null) => {
  return React.memo((props) => (
    <ErrorBoundary>
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  ));
};

// Exported lazy components
export const ProgressTracker = withLazyLoading(
  LazyProgressTracker, 
  <LoadingSpinner message="Loading Progress Tracker..." />
);

export const TaskExporter = withLazyLoading(
  LazyTaskExporter,
  <LoadingSpinner message="Loading Export Tools..." />
);

export const TaskImporter = withLazyLoading(
  LazyTaskImporter,
  <LoadingSpinner message="Loading Import Tools..." />
);

export const AnalyticsDashboard = withLazyLoading(
  LazyAnalyticsDashboard,
  <LoadingSpinner message="Loading Analytics..." />
);

// Preload components for better UX
export const preloadComponents = () => {
  // Preload on user interaction or idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('./ProgressTracker');
      import('./TaskExporter');
      import('./TaskImporter');
      import('./AnalyticsDashboard');
    });
  } else {
    setTimeout(() => {
      import('./ProgressTracker');
      import('./TaskExporter');
      import('./TaskImporter');
      import('./AnalyticsDashboard');
    }, 2000);
  }
};

export default {
  ProgressTracker,
  TaskExporter,
  TaskImporter,
  AnalyticsDashboard,
  preloadComponents
};
