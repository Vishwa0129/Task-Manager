// Enhanced performance utilities with advanced debounce and throttle, improved memoization with TTL and LRU cache, enhanced bundle size analysis, performance and memory monitoring with metrics and leak detection, and added specialized memoization hooks for React.

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { logger } from './logger';

// Advanced debounce utility with immediate execution option and error handling
export const debounce = (func, delay, immediate = false) => {
  if (typeof func !== 'function') {
    logger.error('debounce', 'First argument must be a function', { func, delay });
    throw new TypeError('debounce: First argument must be a function');
  }
  
  if (typeof delay !== 'number' || delay < 0) {
    logger.warn('debounce', 'Invalid delay, using default 300ms', { delay });
    delay = 300;
  }
  
  let timeoutId;
  return function executedFunction(...args) {
    try {
      const later = () => {
        timeoutId = null;
        if (!immediate) {
          try {
            func.apply(this, args);
          } catch (error) {
            logger.error('debounce', 'Error in debounced function execution', { error, args });
          }
        }
      };
      const callNow = immediate && !timeoutId;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(later, delay);
      if (callNow) {
        try {
          func.apply(this, args);
        } catch (error) {
          logger.error('debounce', 'Error in immediate function execution', { error, args });
        }
      }
    } catch (error) {
      logger.error('debounce', 'Error in debounce wrapper', { error, args });
    }
  };
};

// Enhanced throttle utility with leading and trailing options and error handling
export const throttle = (func, limit, options = {}) => {
  if (typeof func !== 'function') {
    logger.error('throttle', 'First argument must be a function', { func, limit });
    throw new TypeError('throttle: First argument must be a function');
  }
  
  if (typeof limit !== 'number' || limit < 0) {
    logger.warn('throttle', 'Invalid limit, using default 100ms', { limit });
    limit = 100;
  }
  
  const { leading = true, trailing = true } = options;
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function executedFunction(...args) {
    try {
      if (!inThrottle) {
        if (leading) {
          try {
            func.apply(this, args);
          } catch (error) {
            logger.error('throttle', 'Error in leading function execution', { error, args });
          }
        }
        lastRan = Date.now();
        inThrottle = true;
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            if (trailing) {
              try {
                func.apply(this, args);
              } catch (error) {
                logger.error('throttle', 'Error in trailing function execution', { error, args });
              }
            }
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    } catch (error) {
      logger.error('throttle', 'Error in throttle wrapper', { error, args });
    }
  };
};

// Simple lazy loading utility
export const lazyLoad = (importFunc) => {
  return importFunc;
};

// Advanced memoization utility with LRU cache and TTL support
const createMemoizedFunction = (fn, options = {}) => {
  const { 
    maxCacheSize = 100, 
    ttl = null, // Time to live in milliseconds
    keyGenerator = JSON.stringify 
  } = options;
  
  const cache = new Map();
  const timestamps = new Map();
  
  return (...args) => {
    const key = keyGenerator(args);
    const now = Date.now();
    
    // Check if cached result exists and is still valid
    if (cache.has(key)) {
      const timestamp = timestamps.get(key);
      if (!ttl || (now - timestamp) < ttl) {
        // Move to end (LRU)
        const value = cache.get(key);
        cache.delete(key);
        cache.set(key, value);
        return value;
      } else {
        // Expired, remove from cache
        cache.delete(key);
        timestamps.delete(key);
      }
    }
    
    const result = fn(...args);
    
    // Implement LRU eviction
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
      timestamps.delete(firstKey);
    }
    
    cache.set(key, result);
    timestamps.set(key, now);
    return result;
  };
};

// Export enhanced memoization functions
export const memoize = createMemoizedFunction;

// Specialized memoization for React components
export const memoizeComponent = (component, options = {}) => {
  const { 
    maxCacheSize = 50,
    keyGenerator = (props) => JSON.stringify(props)
  } = options;
  
  return createMemoizedFunction(component, { maxCacheSize, keyGenerator });
};

// Memoization for async functions
export const memoizeAsync = (asyncFn, options = {}) => {
  const cache = new Map();
  const { maxCacheSize = 100, ttl = 300000 } = options; // 5 min default TTL
  
  return async (...args) => {
    const key = JSON.stringify(args);
    const now = Date.now();
    
    if (cache.has(key)) {
      const { result, timestamp, promise } = cache.get(key);
      
      // Return cached promise if still pending
      if (promise && promise.isPending) {
        return promise;
      }
      
      // Return cached result if still valid
      if (!ttl || (now - timestamp) < ttl) {
        return result;
      }
      
      cache.delete(key);
    }
    
    // Create new promise
    const promise = asyncFn(...args);
    promise.isPending = true;
    
    cache.set(key, { promise, timestamp: now });
    
    try {
      const result = await promise;
      promise.isPending = false;
      
      // Update cache with result
      cache.set(key, { result, timestamp: now });
      
      // Implement LRU eviction
      if (cache.size > maxCacheSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    } catch (error) {
      promise.isPending = false;
      cache.delete(key);
      throw error;
    }
  };
};

// Performance optimization hooks
export const useOptimizedCallback = (callback, deps, options = {}) => {
  const { debounceMs = 0, throttleMs = 0 } = options;
  
  const memoizedCallback = useCallback(callback, deps);
  
  return useMemo(() => {
    if (debounceMs > 0) {
      return debounce(memoizedCallback, debounceMs);
    }
    if (throttleMs > 0) {
      return throttle(memoizedCallback, throttleMs);
    }
    return memoizedCallback;
  }, [memoizedCallback, debounceMs, throttleMs]);
};

export const useOptimizedMemo = (factory, deps, options = {}) => {
  const { ttl = null } = options;
  const timestampRef = useRef(null);
  const valueRef = useRef(null);
  
  return useMemo(() => {
    const now = Date.now();
    
    // Check if cached value is still valid
    if (valueRef.current !== null && timestampRef.current !== null) {
      if (!ttl || (now - timestampRef.current) < ttl) {
        return valueRef.current;
      }
    }
    
    // Compute new value
    const newValue = factory();
    valueRef.current = newValue;
    timestampRef.current = now;
    
    return newValue;
  }, deps);
};

// Virtual scrolling utility for large lists
export class VirtualScroller {
  constructor(containerHeight, itemHeight, buffer = 5) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.buffer = buffer;
  }
  
  getVisibleRange(scrollTop, totalItems) {
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + this.containerHeight) / this.itemHeight) + this.buffer
    );
    
    return { startIndex, endIndex };
  }
  
  getTotalHeight(totalItems) {
    return totalItems * this.itemHeight;
  }
  
  getOffsetY(startIndex) {
    return startIndex * this.itemHeight;
  }
}

// Image lazy loading utility with error handling
export const useImageLazyLoading = () => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  
  const loadImage = useCallback((src) => {
    if (!src || typeof src !== 'string') {
      logger.error('useImageLazyLoading', 'Invalid image source', { src });
      return Promise.reject(new Error('Invalid image source'));
    }
    
    if (loadedImages.has(src)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, src]));
          logger.debug('useImageLazyLoading', 'Image loaded successfully', { src });
          resolve();
        };
        img.onerror = (error) => {
          logger.error('useImageLazyLoading', 'Failed to load image', { src, error });
          reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
      } catch (error) {
        logger.error('useImageLazyLoading', 'Error in image loading setup', { src, error });
        reject(error);
      }
    });
  }, [loadedImages]);
  
  return { loadedImages, loadImage };
};

// Enhanced bundle size analysis utility
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    console.group('📊 Bundle Analysis');
    console.log('📜 Scripts:', scripts.length);
    console.log('🎨 Stylesheets:', styles.length);
    
    // More accurate size estimation
    let totalSize = 0;
    scripts.forEach(script => {
      if (script.src.includes('chunk')) totalSize += 100; // Main chunks
      else if (script.src.includes('vendor')) totalSize += 200; // Vendor chunks
      else totalSize += 50; // Other scripts
    });
    
    styles.forEach(() => totalSize += 30); // CSS files
    
    console.log(`📦 Estimated bundle size: ~${totalSize}KB`);
    
    // Performance recommendations
    if (totalSize > 500) {
      console.warn('⚠️ Large bundle detected. Consider code splitting.');
    }
    if (scripts.length > 10) {
      console.warn('⚠️ Many script files. Consider bundling optimization.');
    }
    
    console.groupEnd();
  }
};

// Enhanced performance monitoring with metrics collection
export const performanceMonitor = {
  measurements: new Map(),
  observers: [],
  
  startMeasure(label) {
    const startTime = performance.now();
    this.measurements.set(label, { startTime, endTime: null });
    if (performance.mark) {
      performance.mark(`${label}-start`);
    }
    return startTime;
  },
  
  endMeasure(label) {
    const endTime = performance.now();
    const measurement = this.measurements.get(label);
    
    if (!measurement) {
      console.warn(`⚠️ No start measurement found for: ${label}`);
      return 0;
    }
    
    measurement.endTime = endTime;
    const duration = endTime - measurement.startTime;
    
    if (performance.mark && performance.measure) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
    }
    
    // Performance warnings with context
    if (duration > 100) {
      console.warn(`🐌 Performance warning: ${label} took ${duration.toFixed(2)}ms`);
    } else if (duration > 50) {
      console.info(`⏱️ Performance info: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer({ label, duration, startTime: measurement.startTime, endTime });
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
    
    return duration;
  },
  
  measure(fn, label) {
    this.startMeasure(label);
    try {
      const result = fn();
      this.endMeasure(label);
      return result;
    } catch (error) {
      this.endMeasure(label);
      throw error;
    }
  },
  
  addObserver(callback) {
    this.observers.push(callback);
  },
  
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  },
  
  getMetrics() {
    const metrics = {};
    this.measurements.forEach((measurement, label) => {
      if (measurement.endTime) {
        metrics[label] = {
          duration: measurement.endTime - measurement.startTime,
          startTime: measurement.startTime,
          endTime: measurement.endTime
        };
      }
    });
    return metrics;
  },
  
  clearMetrics() {
    this.measurements.clear();
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }
};

// Enhanced memory monitoring utility with leak detection
export const memoryMonitor = {
  baseline: null,
  measurements: [],
  
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  },
  
  setBaseline() {
    this.baseline = this.getMemoryUsage();
    console.log('🎯 Memory baseline set:', this.baseline);
  },
  
  checkMemoryLeak() {
    const current = this.getMemoryUsage();
    if (!current || !this.baseline) return null;
    
    const increase = current.used - this.baseline.used;
    const percentIncrease = (increase / this.baseline.used) * 100;
    
    if (percentIncrease > 50) {
      console.warn(`🚨 Potential memory leak detected! Memory increased by ${increase}MB (${percentIncrease.toFixed(1)}%)`);
    }
    
    return { increase, percentIncrease, current, baseline: this.baseline };
  },
  
  logMemoryUsage(label = '') {
    const memory = this.getMemoryUsage();
    if (memory) {
      const usage = `${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`;
      const percentage = ((memory.used / memory.limit) * 100).toFixed(1);
      
      console.log(`🧠 Memory ${label}: ${usage} (${percentage}% of limit)`);
      
      // Store measurement for trend analysis
      this.measurements.push({
        timestamp: Date.now(),
        ...memory,
        label
      });
      
      // Keep only last 100 measurements
      if (this.measurements.length > 100) {
        this.measurements = this.measurements.slice(-100);
      }
      
      // Warning thresholds
      if (percentage > 80) {
        console.warn('⚠️ High memory usage detected!');
      }
    }
  },
  
  getMemoryTrend() {
    if (this.measurements.length < 2) return null;
    
    const recent = this.measurements.slice(-10);
    const trend = recent.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      const prev = recent[index - 1];
      acc.push(curr.used - prev.used);
      return acc;
    }, []);
    
    const avgChange = trend.reduce((a, b) => a + b, 0) / trend.length;
    return {
      trend: avgChange > 0 ? 'increasing' : avgChange < 0 ? 'decreasing' : 'stable',
      avgChange: avgChange.toFixed(2),
      measurements: recent
    };
  }
};

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Set memory baseline on load
  window.addEventListener('load', () => {
    memoryMonitor.setBaseline();
  });
  
  // Monitor memory usage periodically in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      memoryMonitor.logMemoryUsage('periodic-check');
      memoryMonitor.checkMemoryLeak();
    }, 30000); // Every 30 seconds
  }
}

export default {
  memoize,
  memoizeComponent,
  memoizeAsync,
  debounce,
  throttle,
  performanceMonitor,
  memoryMonitor,
  analyzeBundleSize,
  VirtualScroller,
  useImageLazyLoading,
  useOptimizedCallback,
  useOptimizedMemo,
  lazyLoad
};
