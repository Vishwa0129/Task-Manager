// Enhanced Performance Monitoring and Optimization Utilities
import { logger } from './logger';

// Performance Monitor Class with comprehensive metrics
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.memoryLeakDetector = new MemoryLeakDetector();
    this.isMonitoring = false;
  }

  // Start performance measurement
  startMeasure(name) {
    try {
      if (typeof name !== 'string') {
        logger.error('PerformanceMonitor', 'Measure name must be a string', { name });
        return;
      }

      const startTime = performance.now();
      this.metrics.set(name, {
        startTime,
        endTime: null,
        duration: null,
        memory: this.getMemoryUsage(),
        timestamp: Date.now()
      });

      logger.debug('PerformanceMonitor', `Started measuring: ${name}`, { startTime });
    } catch (error) {
      logger.error('PerformanceMonitor', 'Error starting measurement', { name, error });
    }
  }

  // End performance measurement
  endMeasure(name) {
    try {
      const metric = this.metrics.get(name);
      if (!metric) {
        logger.warn('PerformanceMonitor', `No measurement found for: ${name}`);
        return null;
      }

      const endTime = performance.now();
      const duration = endTime - metric.startTime;
      
      metric.endTime = endTime;
      metric.duration = duration;
      metric.memoryEnd = this.getMemoryUsage();

      logger.info('PerformanceMonitor', `Measurement completed: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: metric.memoryEnd - metric.memory
      });

      // Check for performance warnings
      if (duration > 100) {
        logger.warn('PerformanceMonitor', `Slow operation detected: ${name}`, { duration });
      }

      return metric;
    } catch (error) {
      logger.error('PerformanceMonitor', 'Error ending measurement', { name, error });
      return null;
    }
  }

  // Measure function execution
  measure(fn, name) {
    try {
      this.startMeasure(name);
      const result = fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      logger.error('PerformanceMonitor', 'Error in measured function', { name, error });
      throw error;
    }
  }

  // Get memory usage information
  getMemoryUsage() {
    try {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return { used: 0, total: 0, limit: 0 };
    } catch (error) {
      logger.error('PerformanceMonitor', 'Error getting memory usage', { error });
      return { used: 0, total: 0, limit: 0 };
    }
  }

  // Get all metrics
  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, metric]) => ({
      name,
      ...metric
    }));
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
    logger.info('PerformanceMonitor', 'Metrics cleared');
  }

  // Start continuous monitoring
  startMonitoring(interval = 5000) {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const memory = this.getMemoryUsage();
      const memoryUsagePercent = (memory.used / memory.limit) * 100;

      if (memoryUsagePercent > 80) {
        logger.warn('PerformanceMonitor', 'High memory usage detected', {
          usage: `${memoryUsagePercent.toFixed(2)}%`,
          used: memory.used,
          limit: memory.limit
        });
      }

      this.memoryLeakDetector.checkForLeaks();
    }, interval);

    logger.info('PerformanceMonitor', 'Continuous monitoring started', { interval });
  }

  // Stop continuous monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;

    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    logger.info('PerformanceMonitor', 'Continuous monitoring stopped');
  }
}

// Memory Leak Detection
class MemoryLeakDetector {
  constructor() {
    this.memoryHistory = [];
    this.maxHistorySize = 10;
    this.leakThreshold = 50; // MB
  }

  checkForLeaks() {
    try {
      const memory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      this.memoryHistory.push({
        usage: memory,
        timestamp: Date.now()
      });

      // Keep only recent history
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }

      // Check for consistent memory growth
      if (this.memoryHistory.length >= this.maxHistorySize) {
        const first = this.memoryHistory[0];
        const last = this.memoryHistory[this.memoryHistory.length - 1];
        const growth = (last.usage - first.usage) / (1024 * 1024); // Convert to MB

        if (growth > this.leakThreshold) {
          logger.error('MemoryLeakDetector', 'Potential memory leak detected', {
            growth: `${growth.toFixed(2)}MB`,
            timespan: `${(last.timestamp - first.timestamp) / 1000}s`
          });
        }
      }
    } catch (error) {
      logger.error('MemoryLeakDetector', 'Error checking for memory leaks', { error });
    }
  }
}

// Advanced Caching with TTL and LRU
export class AdvancedCache {
  constructor(maxSize = 100, defaultTTL = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.accessOrder = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    try {
      const now = Date.now();
      const expiresAt = ttl ? now + ttl : null;

      // Remove oldest item if cache is full
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        const oldestKey = this.accessOrder.keys().next().value;
        this.delete(oldestKey);
      }

      this.cache.set(key, {
        value,
        createdAt: now,
        expiresAt,
        accessCount: 0
      });

      this.accessOrder.set(key, now);
      logger.debug('AdvancedCache', 'Item cached', { key, ttl, size: this.cache.size });
    } catch (error) {
      logger.error('AdvancedCache', 'Error setting cache item', { key, error });
    }
  }

  get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) return undefined;

      const now = Date.now();

      // Check if item has expired
      if (item.expiresAt && now > item.expiresAt) {
        this.delete(key);
        logger.debug('AdvancedCache', 'Cache item expired', { key });
        return undefined;
      }

      // Update access information
      item.accessCount++;
      this.accessOrder.set(key, now);

      logger.debug('AdvancedCache', 'Cache hit', { key, accessCount: item.accessCount });
      return item.value;
    } catch (error) {
      logger.error('AdvancedCache', 'Error getting cache item', { key, error });
      return undefined;
    }
  }

  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      this.accessOrder.delete(key);
      if (deleted) {
        logger.debug('AdvancedCache', 'Cache item deleted', { key });
      }
      return deleted;
    } catch (error) {
      logger.error('AdvancedCache', 'Error deleting cache item', { key, error });
      return false;
    }
  }

  clear() {
    try {
      this.cache.clear();
      this.accessOrder.clear();
      logger.info('AdvancedCache', 'Cache cleared');
    } catch (error) {
      logger.error('AdvancedCache', 'Error clearing cache', { error });
    }
  }

  // Get cache statistics
  getStats() {
    try {
      const items = Array.from(this.cache.values());
      const now = Date.now();
      
      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        totalAccesses: items.reduce((sum, item) => sum + item.accessCount, 0),
        expiredItems: items.filter(item => item.expiresAt && now > item.expiresAt).length,
        averageAge: items.length > 0 
          ? items.reduce((sum, item) => sum + (now - item.createdAt), 0) / items.length 
          : 0
      };
    } catch (error) {
      logger.error('AdvancedCache', 'Error getting cache stats', { error });
      return { size: 0, maxSize: this.maxSize, totalAccesses: 0, expiredItems: 0, averageAge: 0 };
    }
  }
}

// Bundle Size Analyzer
export class BundleSizeAnalyzer {
  static analyze() {
    try {
      if (typeof window === 'undefined') return null;

      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      const analysis = {
        scripts: scripts.map(script => ({
          src: script.src,
          async: script.async,
          defer: script.defer,
          estimatedSize: this.estimateResourceSize(script.src)
        })),
        stylesheets: stylesheets.map(link => ({
          href: link.href,
          estimatedSize: this.estimateResourceSize(link.href)
        })),
        totalEstimatedSize: 0,
        recommendations: []
      };

      analysis.totalEstimatedSize = [
        ...analysis.scripts,
        ...analysis.stylesheets
      ].reduce((total, resource) => total + resource.estimatedSize, 0);

      // Generate recommendations
      if (analysis.totalEstimatedSize > 1024 * 1024) { // > 1MB
        analysis.recommendations.push('Consider code splitting to reduce bundle size');
      }

      if (analysis.scripts.some(script => !script.async && !script.defer)) {
        analysis.recommendations.push('Consider adding async or defer attributes to scripts');
      }

      logger.info('BundleSizeAnalyzer', 'Bundle analysis completed', {
        totalSize: `${(analysis.totalEstimatedSize / 1024).toFixed(2)}KB`,
        scriptCount: analysis.scripts.length,
        stylesheetCount: analysis.stylesheets.length
      });

      return analysis;
    } catch (error) {
      logger.error('BundleSizeAnalyzer', 'Error analyzing bundle size', { error });
      return null;
    }
  }

  static estimateResourceSize(url) {
    try {
      // Simple heuristic based on URL patterns
      if (url.includes('chunk') || url.includes('vendor')) {
        return 200 * 1024; // 200KB estimate for chunks
      }
      if (url.includes('.min.')) {
        return 50 * 1024; // 50KB estimate for minified files
      }
      return 100 * 1024; // 100KB default estimate
    } catch (error) {
      logger.error('BundleSizeAnalyzer', 'Error estimating resource size', { url, error });
      return 0;
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Global cache instance
export const globalCache = new AdvancedCache();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.stopMonitoring();
    logger.info('enhancedPerformance', 'Performance monitoring stopped on page unload');
  });
}
