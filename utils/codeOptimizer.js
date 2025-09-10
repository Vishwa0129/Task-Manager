// Advanced code optimization utilities
import React from 'react';
import { logger } from './logger';
import { performanceMonitor } from './enhancedPerformance';

export class CodeOptimizer {
  constructor() {
    this.optimizations = new Map();
    this.metrics = {
      bundleSize: 0,
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }

  // Bundle size analyzer
  analyzeBundleSize() {
    if (typeof window !== 'undefined' && window.performance) {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const entry = entries[0];
        this.metrics.bundleSize = entry.transferSize || 0;
        this.metrics.loadTime = entry.loadEventEnd - entry.loadEventStart;
        
        logger.info('Bundle analysis completed', {
          size: this.formatBytes(this.metrics.bundleSize),
          loadTime: `${this.metrics.loadTime}ms`
        });
      }
    }
    return this.metrics;
  }

  // Memory usage optimizer
  optimizeMemoryUsage() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      
      // Suggest garbage collection if memory usage is high
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
        logger.warn('High memory usage detected', {
          used: this.formatBytes(memory.usedJSHeapSize),
          limit: this.formatBytes(memory.jsHeapSizeLimit)
        });
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
          logger.info('Garbage collection triggered');
        }
      }
    }
  }

  // Component render optimizer
  optimizeComponentRender(componentName, renderFunction) {
    return (...args) => {
      const startTime = performance.now();
      const result = renderFunction(...args);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      this.optimizations.set(componentName, {
        lastRenderTime: renderTime,
        averageRenderTime: this.calculateAverageRenderTime(componentName, renderTime),
        renderCount: (this.optimizations.get(componentName)?.renderCount || 0) + 1
      });
      
      if (renderTime > 16) { // More than one frame at 60fps
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`
        });
      }
      
      return result;
    };
  }

  // Calculate average render time
  calculateAverageRenderTime(componentName, newTime) {
    const existing = this.optimizations.get(componentName);
    if (!existing) return newTime;
    
    const count = existing.renderCount || 1;
    const currentAverage = existing.averageRenderTime || newTime;
    return (currentAverage * count + newTime) / (count + 1);
  }

  // Code splitting helper
  createLazyComponent(importFunction, fallback = null) {
    return React.lazy(() => {
      const startTime = performance.now();
      return importFunction().then(module => {
        const loadTime = performance.now() - startTime;
        logger.info('Lazy component loaded', { loadTime: `${loadTime.toFixed(2)}ms` });
        return module;
      }).catch(error => {
        logger.error('Failed to load lazy component', { error });
        throw error;
      });
    });
  }

  // Image optimization
  optimizeImage(src, options = {}) {
    const {
      width = 'auto',
      height = 'auto',
      quality = 80,
      format = 'webp',
      lazy = true
    } = options;

    // Create optimized image URL (this would typically use a service like Cloudinary)
    const optimizedSrc = this.buildOptimizedImageUrl(src, { width, height, quality, format });
    
    return {
      src: optimizedSrc,
      loading: lazy ? 'lazy' : 'eager',
      decoding: 'async',
      onLoad: () => logger.debug('Image loaded', { src: optimizedSrc }),
      onError: () => logger.error('Image failed to load', { src: optimizedSrc })
    };
  }

  buildOptimizedImageUrl(src, options) {
    // This is a placeholder - in a real app, you'd use an image optimization service
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== 'auto') params.append(key, value);
    });
    
    return params.toString() ? `${src}?${params.toString()}` : src;
  }

  // CSS optimization
  optimizeCSS() {
    if (typeof document !== 'undefined') {
      const stylesheets = Array.from(document.styleSheets);
      let totalRules = 0;
      let unusedRules = 0;

      stylesheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          totalRules += rules.length;
          
          rules.forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
              try {
                if (!document.querySelector(rule.selectorText)) {
                  unusedRules++;
                }
              } catch (e) {
                // Invalid selector, skip
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      });

      const efficiency = totalRules > 0 ? ((totalRules - unusedRules) / totalRules) * 100 : 100;
      
      logger.info('CSS optimization analysis', {
        totalRules,
        unusedRules,
        efficiency: `${efficiency.toFixed(1)}%`
      });

      return { totalRules, unusedRules, efficiency };
    }
  }

  // JavaScript optimization
  optimizeJavaScript() {
    const optimizations = [];

    // Check for console.log statements in production
    if (process.env.NODE_ENV === 'production') {
      const hasConsoleLogs = this.checkForConsoleLogs();
      if (hasConsoleLogs) {
        optimizations.push('Remove console.log statements in production');
      }
    }

    // Check for unused variables (basic check)
    const unusedVars = this.findUnusedVariables();
    if (unusedVars.length > 0) {
      optimizations.push(`Found ${unusedVars.length} potentially unused variables`);
    }

    logger.info('JavaScript optimization suggestions', { optimizations });
    return optimizations;
  }

  checkForConsoleLogs() {
    // This is a simplified check - in a real implementation, you'd use AST parsing
    const scripts = Array.from(document.scripts);
    return scripts.some(script => {
      try {
        return script.innerHTML.includes('console.log');
      } catch (e) {
        return false;
      }
    });
  }

  findUnusedVariables() {
    // Placeholder for unused variable detection
    // In a real implementation, you'd use tools like ESLint or custom AST analysis
    return [];
  }

  // Performance budget checker
  checkPerformanceBudget(budget = {}) {
    const defaultBudget = {
      bundleSize: 250 * 1024, // 250KB
      loadTime: 3000, // 3 seconds
      renderTime: 16, // 16ms (60fps)
      memoryUsage: 50 * 1024 * 1024 // 50MB
    };

    const currentBudget = { ...defaultBudget, ...budget };
    const violations = [];

    Object.entries(currentBudget).forEach(([metric, limit]) => {
      const current = this.metrics[metric];
      if (current > limit) {
        violations.push({
          metric,
          current: this.formatMetric(metric, current),
          limit: this.formatMetric(metric, limit),
          overBy: this.formatMetric(metric, current - limit)
        });
      }
    });

    if (violations.length > 0) {
      logger.warn('Performance budget violations', { violations });
    } else {
      logger.info('All performance budgets met');
    }

    return violations;
  }

  formatMetric(metric, value) {
    switch (metric) {
      case 'bundleSize':
      case 'memoryUsage':
        return this.formatBytes(value);
      case 'loadTime':
      case 'renderTime':
        return `${value}ms`;
      default:
        return value.toString();
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate optimization report
  generateReport() {
    this.analyzeBundleSize();
    this.optimizeMemoryUsage();
    const cssAnalysis = this.optimizeCSS();
    const jsOptimizations = this.optimizeJavaScript();
    const budgetViolations = this.checkPerformanceBudget();

    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      componentOptimizations: Object.fromEntries(this.optimizations),
      cssAnalysis,
      jsOptimizations,
      budgetViolations,
      recommendations: this.generateRecommendations()
    };

    logger.info('Optimization report generated', { report });
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Bundle size recommendations
    if (this.metrics.bundleSize > 200 * 1024) {
      recommendations.push('Consider code splitting to reduce bundle size');
    }

    // Memory usage recommendations
    if (this.metrics.memoryUsage > 30 * 1024 * 1024) {
      recommendations.push('Monitor memory usage and implement cleanup in useEffect');
    }

    // Render time recommendations
    const slowComponents = Array.from(this.optimizations.entries())
      .filter(([, data]) => data.averageRenderTime > 16)
      .map(([name]) => name);

    if (slowComponents.length > 0) {
      recommendations.push(`Optimize slow components: ${slowComponents.join(', ')}`);
    }

    return recommendations;
  }
}

// Export singleton instance
export const codeOptimizer = new CodeOptimizer();

// React performance hooks
export const usePerformanceMonitor = (componentName) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const mountTime = endTime - startTime;
      logger.debug(`${componentName} mount time`, { mountTime: `${mountTime.toFixed(2)}ms` });
    };
  }, [componentName]);
};

export const useRenderTracker = (componentName, dependencies = []) => {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());

  React.useEffect(() => {
    renderCount.current++;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;

    logger.debug(`${componentName} render #${renderCount.current}`, {
      timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
      dependencies: dependencies.length
    });
  });

  return renderCount.current;
};

// Memoization helpers
export const createMemoizedSelector = (selector, equalityFn = Object.is) => {
  let lastArgs;
  let lastResult;

  return (...args) => {
    if (!lastArgs || !args.every((arg, index) => equalityFn(arg, lastArgs[index]))) {
      lastArgs = args;
      lastResult = selector(...args);
    }
    return lastResult;
  };
};

export const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
};
