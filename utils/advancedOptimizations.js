// Advanced Code Optimizations and Performance Enhancements
import React, { useMemo, useRef } from 'react';
import { logger } from './logger';
import { performanceMonitor } from './enhancedPerformance';

// Advanced React Performance Hooks
export const useAdvancedMemo = (factory, deps, options = {}) => {
  const { 
    ttl = 60000, // 1 minute default
    maxSize = 100,
    keyGenerator = JSON.stringify 
  } = options;
  
  const cacheRef = useRef(new Map());
  const timestampRef = useRef(new Map());
  
  return useMemo(() => {
    const key = keyGenerator(deps);
    const now = Date.now();
    const cache = cacheRef.current;
    const timestamps = timestampRef.current;
    
    // Check if cached value exists and is still valid
    if (cache.has(key)) {
      const timestamp = timestamps.get(key);
      if (timestamp && (now - timestamp) < ttl) {
        logger.debug('useAdvancedMemo', 'Cache hit', { key, age: now - timestamp });
        return cache.get(key);
      }
    }
    
    // Compute new value
    const startTime = performance.now();
    const value = factory();
    const computeTime = performance.now() - startTime;
    
    // Store in cache
    cache.set(key, value);
    timestamps.set(key, now);
    
    // Maintain cache size
    if (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
      timestamps.delete(oldestKey);
    }
    
    logger.debug('useAdvancedMemo', 'Value computed and cached', { 
      key, 
      computeTime: `${computeTime.toFixed(2)}ms`,
      cacheSize: cache.size 
    });
    
    return value;
  }, deps);
};

// Intelligent Batch Processing
export class BatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 50;
    this.delay = options.delay || 100;
    this.maxWait = options.maxWait || 1000;
    this.queue = [];
    this.processing = false;
    this.timeoutId = null;
    this.startTime = null;
  }

  add(item) {
    this.queue.push(item);
    
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    
    // Process immediately if batch is full or max wait time exceeded
    const shouldProcessNow = 
      this.queue.length >= this.batchSize || 
      (Date.now() - this.startTime) >= this.maxWait;
    
    if (shouldProcessNow) {
      this.processBatch();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.processBatch(), this.delay);
    }
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.startTime = null;
    
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      logger.debug('BatchProcessor', 'Processing batch', { size: batch.length });
      await this.processBatchItems(batch);
    } catch (error) {
      logger.error('BatchProcessor', 'Batch processing failed', { error, batchSize: batch.length });
    } finally {
      this.processing = false;
      
      // Process remaining items if any
      if (this.queue.length > 0) {
        this.startTime = Date.now();
        this.timeoutId = setTimeout(() => this.processBatch(), this.delay);
      }
    }
  }

  async processBatchItems(items) {
    // Override this method in subclasses
    return Promise.all(items.map(item => this.processItem(item)));
  }

  async processItem(item) {
    // Override this method in subclasses
    return item;
  }
}

// Smart Component Lazy Loading
export const createSmartLazyComponent = (importFunc, options = {}) => {
  const { 
    preload = false,
    retryCount = 3,
    retryDelay = 1000,
    fallback = null 
  } = options;
  
  let componentPromise = null;
  let retries = 0;
  
  const loadComponent = async () => {
    if (componentPromise) return componentPromise;
    
    componentPromise = (async () => {
      try {
        logger.debug('SmartLazyComponent', 'Loading component', { retries });
        const module = await importFunc();
        logger.info('SmartLazyComponent', 'Component loaded successfully');
        return module;
      } catch (error) {
        logger.error('SmartLazyComponent', 'Component loading failed', { error, retries });
        
        if (retries < retryCount) {
          retries++;
          componentPromise = null;
          
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          return loadComponent();
        }
        
        throw error;
      }
    })();
    
    return componentPromise;
  };
  
  const LazyComponent = React.lazy(loadComponent);
  
  // Preload if requested
  if (preload) {
    loadComponent().catch(() => {
      logger.warn('SmartLazyComponent', 'Preload failed, will retry on demand');
    });
  }
  
  return React.forwardRef((props, ref) => (
    <React.Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} ref={ref} />
    </React.Suspense>
  ));
};

// Advanced State Management
export class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.middleware = [];
    this.history = [];
    this.maxHistory = 50;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  setState(updates, meta = {}) {
    const prevState = { ...this.state };
    
    // Apply middleware
    let processedUpdates = updates;
    for (const middleware of this.middleware) {
      processedUpdates = middleware(processedUpdates, prevState, meta);
    }
    
    // Update state
    this.state = { ...this.state, ...processedUpdates };
    
    // Add to history
    this.history.push({
      timestamp: Date.now(),
      prevState,
      updates: processedUpdates,
      newState: { ...this.state },
      meta
    });
    
    // Maintain history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState, processedUpdates);
      } catch (error) {
        logger.error('StateManager', 'Listener error', { error });
      }
    });
    
    logger.debug('StateManager', 'State updated', { 
      updates: processedUpdates, 
      listenerCount: this.listeners.size 
    });
  }

  getState() {
    return { ...this.state };
  }

  getHistory() {
    return [...this.history];
  }

  undo() {
    if (this.history.length < 2) return false;
    
    const current = this.history.pop();
    const previous = this.history[this.history.length - 1];
    
    this.state = { ...previous.newState };
    this.listeners.forEach(listener => {
      try {
        listener(this.state, current.newState, {});
      } catch (error) {
        logger.error('StateManager', 'Undo listener error', { error });
      }
    });
    
    logger.info('StateManager', 'State undone', { 
      from: current.newState, 
      to: this.state 
    });
    
    return true;
  }
}

// Performance Monitoring Middleware
export const performanceMiddleware = (updates, prevState, meta) => {
  const startTime = performance.now();
  
  // Track state update performance
  performanceMonitor.startMeasure(`state-update-${meta.action || 'unknown'}`);
  
  // Add performance tracking to meta
  const enhancedMeta = {
    ...meta,
    performanceStart: startTime,
    stateSize: JSON.stringify(prevState).length
  };
  
  // End measurement after a microtask
  Promise.resolve().then(() => {
    performanceMonitor.endMeasure(`state-update-${meta.action || 'unknown'}`);
  });
  
  return updates;
};

// Memory Optimization Utilities
export class MemoryOptimizer {
  static weakMapCache = new WeakMap();
  static objectPool = new Map();
  
  static createObjectPool(type, factory, maxSize = 100) {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, {
        available: [],
        factory,
        maxSize,
        created: 0,
        reused: 0
      });
    }
    
    return this.objectPool.get(type);
  }
  
  static borrowObject(type) {
    const pool = this.objectPool.get(type);
    if (!pool) return null;
    
    if (pool.available.length > 0) {
      pool.reused++;
      return pool.available.pop();
    }
    
    if (pool.created < pool.maxSize) {
      pool.created++;
      return pool.factory();
    }
    
    return null;
  }
  
  static returnObject(type, obj) {
    const pool = this.objectPool.get(type);
    if (!pool || pool.available.length >= pool.maxSize) return false;
    
    // Reset object state if it has a reset method
    if (obj && typeof obj.reset === 'function') {
      obj.reset();
    }
    
    pool.available.push(obj);
    return true;
  }
  
  static getPoolStats() {
    const stats = {};
    this.objectPool.forEach((pool, type) => {
      stats[type] = {
        available: pool.available.length,
        created: pool.created,
        reused: pool.reused,
        efficiency: pool.reused / (pool.created + pool.reused) * 100
      };
    });
    return stats;
  }
  
  static clearPools() {
    this.objectPool.clear();
    logger.info('MemoryOptimizer', 'Object pools cleared');
  }
}

// Advanced Error Recovery
export class ErrorRecovery {
  static strategies = new Map();
  
  static registerStrategy(errorType, strategy) {
    this.strategies.set(errorType, strategy);
  }
  
  static async recover(error, context = {}) {
    const errorType = error.name || error.constructor.name;
    const strategy = this.strategies.get(errorType) || this.strategies.get('default');
    
    if (!strategy) {
      logger.error('ErrorRecovery', 'No recovery strategy found', { errorType, error });
      throw error;
    }
    
    try {
      logger.info('ErrorRecovery', 'Attempting recovery', { errorType, strategy: strategy.name });
      const result = await strategy(error, context);
      logger.info('ErrorRecovery', 'Recovery successful', { errorType });
      return result;
    } catch (recoveryError) {
      logger.error('ErrorRecovery', 'Recovery failed', { errorType, recoveryError });
      throw recoveryError;
    }
  }
}

// Register default recovery strategies
ErrorRecovery.registerStrategy('NetworkError', async (error, context) => {
  // Retry with exponential backoff
  const maxRetries = 3;
  let delay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      if (context.retryFunction) {
        return await context.retryFunction();
      }
    } catch (retryError) {
      delay *= 2;
      if (i === maxRetries - 1) throw retryError;
    }
  }
});

ErrorRecovery.registerStrategy('default', async (error, context) => {
  // Default recovery: log and re-throw
  logger.error('ErrorRecovery', 'Using default recovery strategy', { error, context });
  throw error;
});

// Export utilities
export { React };
