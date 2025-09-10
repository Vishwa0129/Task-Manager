// Advanced logging and error tracking system
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'warn';
    this.listeners = [];
  }

  static instance = null;

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  log(level, message, data = null, category = 'general') {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      category: typeof category === 'string' ? category : String(category || 'general'),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    this.logs.push(logEntry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (error) {
        console.error('Logger listener error:', error);
      }
    });

    // Console output based on log level
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel] || 1;
    const entryLevel = levels[level] || 1;

    if (entryLevel >= currentLevel) {
      const consoleMethod = console[level] || console.log;
      const categoryStr = typeof category === 'string' ? category : String(category || 'general');
      consoleMethod(`[${categoryStr.toUpperCase()}] ${message}`, data || '');
    }

    return logEntry;
  }

  debug(message, data, category = 'general') {
    return this.log('debug', message, data, category);
  }

  info(message, data, category = 'general') {
    return this.log('info', message, data, category);
  }

  warn(message, data, category = 'general') {
    return this.log('warn', message, data, category);
  }

  error(message, data, category = 'general') {
    return this.log('error', message, data, category);
  }

  // Task-specific logging methods
  taskCreated(task) {
    return this.info('Task created', { taskId: task.id, text: task.text }, 'tasks');
  }

  taskUpdated(taskId, changes) {
    return this.info('Task updated', { taskId, changes }, 'tasks');
  }

  taskDeleted(taskId) {
    return this.info('Task deleted', { taskId }, 'tasks');
  }

  taskCompleted(taskId) {
    return this.info('Task completed', { taskId }, 'tasks');
  }

  performanceMetric(metric, value, context) {
    return this.debug('Performance metric', { metric, value, context }, 'performance');
  }

  userAction(action, details) {
    return this.info('User action', { action, details }, 'user');
  }

  exportAction(format, taskCount) {
    return this.info('Data exported', { format, taskCount }, 'export');
  }

  importAction(format, taskCount, errors) {
    return this.info('Data imported', { format, taskCount, errors }, 'import');
  }

  validationError(error, context) {
    return this.error('Validation error', { error: error.message, context }, 'validation');
  }

  // Get logs with filtering
  getLogs(filters = {}) {
    let filteredLogs = [...this.logs];

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower)
      );
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Export logs
  exportLogs(format = 'json') {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Data'];
      const rows = logs.map(log => [
        log.timestamp,
        log.level,
        log.category,
        log.message,
        log.data ? JSON.stringify(log.data) : ''
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
    }
    
    return logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
  }

  // Clear logs
  clearLogs() {
    const count = this.logs.length;
    this.logs = [];
    this.info('Logs cleared', { clearedCount: count }, 'system');
  }

  // Get log statistics
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      timeRange: null
    };

    this.logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by category
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    // Calculate time range
    if (this.logs.length > 0) {
      const timestamps = this.logs.map(log => new Date(log.timestamp));
      stats.timeRange = {
        earliest: new Date(Math.min(...timestamps)).toISOString(),
        latest: new Date(Math.max(...timestamps)).toISOString()
      };
    }

    return stats;
  }
}

// Global error handler
const setupGlobalErrorHandling = () => {
  const logger = Logger.getInstance();

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise
    }, 'error');
  });

  // Global errors
  window.addEventListener('error', (event) => {
    logger.error('Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    }, 'error');
  });

  // React error boundary integration
  window.logReactError = (error, errorInfo) => {
    logger.error('React error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    }, 'react');
  };
};

// Performance monitoring integration
const setupPerformanceMonitoring = () => {
  const logger = Logger.getInstance();

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            logger.performanceMetric('long-task', entry.duration, {
              name: entry.name,
              startTime: entry.startTime
            });
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      logger.debug('Performance observer not available', error, 'performance');
    }
  }

  // Monitor memory usage
  const monitorMemory = () => {
    if (performance.memory) {
      const memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
      
      if (memory.used > memory.limit * 0.8) {
        logger.warn('High memory usage detected', memory, 'performance');
      }
    }
  };

  // Check memory every 30 seconds
  setInterval(monitorMemory, 30000);
};

// Initialize logging system
export const initializeLogging = () => {
  setupGlobalErrorHandling();
  setupPerformanceMonitoring();
  
  const logger = Logger.getInstance();
  logger.info('Logging system initialized', {
    logLevel: logger.logLevel,
    environment: process.env.NODE_ENV
  }, 'system');
  
  return logger;
};

// Export both the class and instance
export const logger = Logger.getInstance();
export default Logger.getInstance();
