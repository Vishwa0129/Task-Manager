import React, { Suspense, lazy } from 'react';
import { logger } from '../utils/logger';
import { codeOptimizer } from '../utils/codeOptimizer';

// Enhanced loading component with better UX
const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  };

  return (
    <div className={`loading-container ${sizeClasses[size]}`}>
      <div className="spinner-advanced">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Lazy component failed to load', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="lazy-error-fallback">
          <div className="error-icon">⚠️</div>
          <h3>Component Failed to Load</h3>
          <p>There was an error loading this component.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="retry-btn"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced lazy component wrapper
export const createAdvancedLazyComponent = (
  importFunction,
  options = {}
) => {
  const {
    fallback = <LoadingSpinner />,
    errorFallback = null,
    preload = false,
    timeout = 10000,
    retries = 3
  } = options;

  let retryCount = 0;

  const LazyComponent = lazy(() => {
    const startTime = performance.now();
    
    const loadWithRetry = async () => {
      try {
        const module = await Promise.race([
          importFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Component load timeout')), timeout)
          )
        ]);
        
        const loadTime = performance.now() - startTime;
        logger.info('Lazy component loaded successfully', { 
          loadTime: `${loadTime.toFixed(2)}ms`,
          retries: retryCount 
        });
        
        return module;
      } catch (error) {
        retryCount++;
        if (retryCount <= retries) {
          logger.warn(`Lazy component load failed, retrying (${retryCount}/${retries})`, { error });
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return loadWithRetry();
        }
        
        logger.error('Lazy component load failed after all retries', { error, retries: retryCount });
        throw error;
      }
    };

    return loadWithRetry();
  });

  // Preload if requested
  if (preload) {
    setTimeout(() => {
      importFunction().catch(error => {
        logger.warn('Preload failed for lazy component', { error });
      });
    }, 100);
  }

  const WrappedComponent = (props) => (
    <LazyErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );

  WrappedComponent.displayName = 'AdvancedLazyComponent';
  return WrappedComponent;
};

// Lazy load with intersection observer for better performance
export const createIntersectionLazyComponent = (
  importFunction,
  options = {}
) => {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    fallback = <LoadingSpinner message="Loading component..." />
  } = options;

  return React.forwardRef((props, ref) => {
    const [shouldLoad, setShouldLoad] = React.useState(false);
    const [isIntersecting, setIsIntersecting] = React.useState(false);
    const elementRef = React.useRef();

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !shouldLoad) {
            setIsIntersecting(true);
            setShouldLoad(true);
            logger.debug('Intersection lazy component triggered');
          }
        },
        { rootMargin, threshold }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [rootMargin, threshold, shouldLoad]);

    const LazyComponent = React.useMemo(() => {
      if (!shouldLoad) return null;
      return createAdvancedLazyComponent(importFunction, { fallback });
    }, [shouldLoad]);

    return (
      <div ref={elementRef} className="intersection-lazy-wrapper">
        {shouldLoad && LazyComponent ? (
          <LazyComponent {...props} ref={ref} />
        ) : (
          <div className="lazy-placeholder">
            <div className="placeholder-content">
              Component will load when visible
            </div>
          </div>
        )}
      </div>
    );
  });
};

// Route-based lazy loading with prefetching
export const createRouteLazyComponent = (
  importFunction,
  routePath,
  options = {}
) => {
  const {
    prefetchOnHover = true,
    prefetchDelay = 200,
    ...lazyOptions
  } = options;

  const LazyComponent = createAdvancedLazyComponent(importFunction, lazyOptions);
  let prefetchTimeout;
  let isPrefetched = false;

  const prefetchComponent = () => {
    if (!isPrefetched) {
      isPrefetched = true;
      importFunction().catch(error => {
        logger.warn('Route prefetch failed', { routePath, error });
        isPrefetched = false;
      });
    }
  };

  const WrappedComponent = (props) => {
    React.useEffect(() => {
      if (prefetchOnHover) {
        const links = document.querySelectorAll(`a[href="${routePath}"]`);
        
        const handleMouseEnter = () => {
          prefetchTimeout = setTimeout(prefetchComponent, prefetchDelay);
        };

        const handleMouseLeave = () => {
          if (prefetchTimeout) {
            clearTimeout(prefetchTimeout);
          }
        };

        links.forEach(link => {
          link.addEventListener('mouseenter', handleMouseEnter);
          link.addEventListener('mouseleave', handleMouseLeave);
        });

        return () => {
          links.forEach(link => {
            link.removeEventListener('mouseenter', handleMouseEnter);
            link.removeEventListener('mouseleave', handleMouseLeave);
          });
          if (prefetchTimeout) {
            clearTimeout(prefetchTimeout);
          }
        };
      }
    }, []);

    return <LazyComponent {...props} />;
  };

  WrappedComponent.displayName = `RouteLazyComponent(${routePath})`;
  return WrappedComponent;
};

// Bundle splitting helper
export const createBundleSplitComponent = (
  components,
  options = {}
) => {
  const {
    loadingStrategy = 'parallel', // 'parallel' or 'sequential'
    fallback = <LoadingSpinner message="Loading components..." />
  } = options;

  const LazyComponents = Object.entries(components).reduce((acc, [key, importFn]) => {
    acc[key] = lazy(importFn);
    return acc;
  }, {});

  return (props) => {
    const [loadedComponents, setLoadedComponents] = React.useState({});
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
      const loadComponents = async () => {
        try {
          if (loadingStrategy === 'parallel') {
            // Load all components in parallel
            const promises = Object.entries(components).map(async ([key, importFn]) => {
              const module = await importFn();
              return [key, module];
            });

            const results = await Promise.all(promises);
            const loaded = Object.fromEntries(results);
            setLoadedComponents(loaded);
          } else {
            // Load components sequentially
            const loaded = {};
            for (const [key, importFn] of Object.entries(components)) {
              loaded[key] = await importFn();
              setLoadedComponents({ ...loaded });
            }
          }
        } catch (error) {
          logger.error('Bundle split component loading failed', { error });
        } finally {
          setIsLoading(false);
        }
      };

      loadComponents();
    }, []);

    if (isLoading) {
      return fallback;
    }

    return (
      <Suspense fallback={fallback}>
        {Object.entries(LazyComponents).map(([key, Component]) => (
          <Component key={key} {...props} />
        ))}
      </Suspense>
    );
  };
};

// Performance monitoring for lazy components
export const useLazyComponentMetrics = (componentName) => {
  const [metrics, setMetrics] = React.useState({
    loadTime: 0,
    renderTime: 0,
    errorCount: 0,
    retryCount: 0
  });

  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime: totalTime
      }));

      logger.debug(`Lazy component metrics for ${componentName}`, {
        renderTime: `${totalTime.toFixed(2)}ms`
      });
    };
  }, [componentName]);

  const recordLoadTime = React.useCallback((loadTime) => {
    setMetrics(prev => ({ ...prev, loadTime }));
  }, []);

  const recordError = React.useCallback(() => {
    setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
  }, []);

  const recordRetry = React.useCallback(() => {
    setMetrics(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
  }, []);

  return {
    metrics,
    recordLoadTime,
    recordError,
    recordRetry
  };
};

export default {
  createAdvancedLazyComponent,
  createIntersectionLazyComponent,
  createRouteLazyComponent,
  createBundleSplitComponent,
  LoadingSpinner,
  LazyErrorBoundary
};
