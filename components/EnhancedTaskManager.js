import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useAdvancedMemo, BatchProcessor, StateManager, performanceMiddleware } from '../utils/advancedOptimizations';
import { performanceMonitor } from '../utils/enhancedPerformance';
import { logger } from '../utils/logger';
import { TaskAnalytics, validateTask, sortTasks, filterTasks, TASK_CATEGORIES, PRIORITY_LEVELS } from '../utils/taskUtils';
import ProgressTracker from './ProgressTracker';
import ErrorBoundary from './ErrorBoundary';
import './Home.css';

// Enhanced Task Batch Processor
class TaskBatchProcessor extends BatchProcessor {
  constructor(taskManager) {
    super({ batchSize: 10, delay: 200, maxWait: 1000 });
    this.taskManager = taskManager;
  }

  async processBatchItems(items) {
    const operations = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});

    const results = [];
    
    for (const [type, ops] of Object.entries(operations)) {
      try {
        switch (type) {
          case 'CREATE':
            results.push(...await this.batchCreateTasks(ops));
            break;
          case 'UPDATE':
            results.push(...await this.batchUpdateTasks(ops));
            break;
          case 'DELETE':
            results.push(...await this.batchDeleteTasks(ops));
            break;
          default:
            logger.warn('TaskBatchProcessor', 'Unknown operation type', { type });
        }
      } catch (error) {
        logger.error('TaskBatchProcessor', 'Batch operation failed', { type, error });
      }
    }

    return results;
  }

  async batchCreateTasks(operations) {
    logger.info('TaskBatchProcessor', 'Batch creating tasks', { count: operations.length });
    return operations.map(op => this.taskManager.addTask(op.data));
  }

  async batchUpdateTasks(operations) {
    logger.info('TaskBatchProcessor', 'Batch updating tasks', { count: operations.length });
    return operations.map(op => this.taskManager.updateTask(op.id, op.data));
  }

  async batchDeleteTasks(operations) {
    logger.info('TaskBatchProcessor', 'Batch deleting tasks', { count: operations.length });
    return operations.map(op => this.taskManager.deleteTask(op.id));
  }
}

// Enhanced Task Manager Component
const EnhancedTaskManager = () => {
  // Core task management
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    editingId,
    editingText,
    setEditingText,
    startEditing,
    cancelEditing,
    saveEditing
  } = useTasks();

  // Enhanced state management
  const [stateManager] = useState(() => {
    const manager = new StateManager({
      filter: 'all',
      categoryFilter: 'all',
      priorityFilter: 'all',
      sortBy: 'createdAt',
      searchTerm: '',
      viewMode: 'list',
      selectedTasks: new Set(),
      bulkOperationMode: false,
      autoSave: true,
      notifications: true
    });
    
    manager.addMiddleware(performanceMiddleware);
    return manager;
  });

  // Batch processor for operations
  const [batchProcessor] = useState(() => new TaskBatchProcessor({
    addTask, updateTask, deleteTask
  }));

  // Local state
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimatedTime, setNewEstimatedTime] = useState('');
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lastSaved, setLastSaved] = useState(Date.now());

  // Get current state
  const currentState = stateManager.getState();

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startMeasure('enhanced-task-manager-mount');
    return () => {
      performanceMonitor.endMeasure('enhanced-task-manager-mount');
    };
  }, []);

  // Advanced memoized filtered and sorted tasks
  const filteredAndSortedTasks = useAdvancedMemo(() => {
    return performanceMonitor.measure(() => {
      let filtered = tasks;

      // Apply search filter
      if (currentState.searchTerm) {
        const query = currentState.searchTerm.toLowerCase();
        filtered = filtered.filter(task => 
          task.text.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query) ||
          task.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      // Apply filters
      filtered = filterTasks(filtered, currentState.filter);
      
      if (currentState.categoryFilter !== 'all') {
        filtered = filtered.filter(task => task.category === currentState.categoryFilter);
      }
      
      if (currentState.priorityFilter !== 'all') {
        filtered = filtered.filter(task => task.priority === currentState.priorityFilter);
      }

      // Sort tasks
      return sortTasks(filtered, currentState.sortBy);
    }, 'filter-and-sort-tasks');
  }, [
    tasks, 
    currentState.filter, 
    currentState.categoryFilter, 
    currentState.priorityFilter, 
    currentState.searchTerm, 
    currentState.sortBy
  ], { ttl: 2000 });

  // Advanced task statistics
  const taskStats = useAdvancedMemo(() => {
    return performanceMonitor.measure(() => {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.completed);
      const overdueTasks = tasks.filter(task => 
        !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
      );
      const todayTasks = tasks.filter(task => {
        const today = new Date().toDateString();
        return task.dueDate && new Date(task.dueDate).toDateString() === today;
      });
      
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
      const productivityScore = TaskAnalytics.calculateProductivityScore(tasks);
      
      // Category breakdown
      const categoryBreakdown = tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {});
      
      // Priority breakdown
      const priorityBreakdown = tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalTasks,
        completedTasks: completedTasks.length,
        completionRate: Math.round(completionRate),
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        productivityScore,
        categoryBreakdown,
        priorityBreakdown,
        streak: TaskAnalytics.getCompletionStreak(tasks)
      };
    }, 'calculate-advanced-task-stats');
  }, [tasks], { ttl: 5000 });

  // Enhanced task operations with batch processing
  const handleBulkOperation = useCallback(async (operation, taskIds) => {
    setIsLoading(true);
    
    try {
      const operations = taskIds.map(id => ({
        type: operation.toUpperCase(),
        id,
        data: operation === 'delete' ? null : { completed: operation === 'complete' }
      }));

      await Promise.all(operations.map(op => batchProcessor.add(op)));
      
      stateManager.setState({ 
        selectedTasks: new Set() 
      }, { action: 'bulk-operation', operation });

      logger.info('EnhancedTaskManager', 'Bulk operation completed', { 
        operation, 
        count: taskIds.length 
      });

    } catch (error) {
      setError(`Bulk ${operation} failed: ${error.message}`);
      logger.error('EnhancedTaskManager', 'Bulk operation failed', { operation, error });
    } finally {
      setIsLoading(false);
    }
  }, [batchProcessor, stateManager]);

  // Enhanced add task with validation and batch processing
  const handleAddTask = useCallback(async () => {
    if (!newTask.trim()) {
      setError('Task text cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const taskData = {
        text: newTask.trim(),
        category: newCategory,
        priority: newPriority,
        dueDate: newDueDate || null,
        description: newDescription.trim(),
        estimatedTime: newEstimatedTime ? parseInt(newEstimatedTime) : null,
        tags: [],
        subtasks: [],
        attachments: []
      };

      const validation = validateTask(taskData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      await batchProcessor.add({
        type: 'CREATE',
        data: taskData
      });
      
      // Reset form
      setNewTask('');
      setNewCategory('general');
      setNewPriority('medium');
      setNewDueDate('');
      setNewDescription('');
      setNewEstimatedTime('');
      
      setLastSaved(Date.now());
      
    } catch (error) {
      setError(error.message || 'Failed to add task');
      logger.error('EnhancedTaskManager', 'Add task failed', { error });
    } finally {
      setIsLoading(false);
    }
  }, [
    newTask, newCategory, newPriority, newDueDate, 
    newDescription, newEstimatedTime, batchProcessor
  ]);

  // Smart search with debouncing
  const handleSearch = useCallback((query) => {
    stateManager.setState({ 
      searchTerm: query.trim().toLowerCase() 
    }, { action: 'search', query });
  }, [stateManager]);

  // Task selection for bulk operations
  const handleTaskSelection = useCallback((taskId, selected) => {
    const selectedTasks = new Set(currentState.selectedTasks);
    
    if (selected) {
      selectedTasks.add(taskId);
    } else {
      selectedTasks.delete(taskId);
    }
    
    stateManager.setState({ selectedTasks }, { action: 'task-selection' });
  }, [currentState.selectedTasks, stateManager]);

  // Auto-save functionality
  useEffect(() => {
    if (!currentState.autoSave) return;

    const autoSaveInterval = setInterval(() => {
      if (Date.now() - lastSaved > 30000) { // 30 seconds
        logger.info('EnhancedTaskManager', 'Auto-saving tasks');
        setLastSaved(Date.now());
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [currentState.autoSave, lastSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            if (currentState.bulkOperationMode) {
              e.preventDefault();
              const allTaskIds = filteredAndSortedTasks.map(task => task.id);
              stateManager.setState({ 
                selectedTasks: new Set(allTaskIds) 
              }, { action: 'select-all' });
            }
            break;
          case 'Enter':
            if (newTask.trim()) {
              e.preventDefault();
              handleAddTask();
            }
            break;
          case 'b':
            e.preventDefault();
            stateManager.setState({ 
              bulkOperationMode: !currentState.bulkOperationMode,
              selectedTasks: new Set()
            }, { action: 'toggle-bulk-mode' });
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    currentState.bulkOperationMode, 
    filteredAndSortedTasks, 
    newTask, 
    handleAddTask, 
    stateManager
  ]);

  return (
    <ErrorBoundary>
      <div className="enhanced-task-manager">
        {/* Performance Stats (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="performance-stats">
            <small>
              Tasks: {tasks.length} | Filtered: {filteredAndSortedTasks.length} | 
              Selected: {currentState.selectedTasks.size} | 
              Last Saved: {new Date(lastSaved).toLocaleTimeString()}
            </small>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-icon">🚀</span>
              Enhanced TaskFlow Manager
            </h1>
            <p className="hero-subtitle">
              Advanced task management with intelligent batch processing and performance optimization
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="stat-number">{taskStats.totalTasks}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="hero-stat">
                <div className="stat-value">{taskStats.completedTasks}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">{taskStats.completionRate}%</div>
                <div className="stat-label">Efficiency</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">{taskStats.productivityScore}</div>
                <div className="stat-label">Score</div>
              </div>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
            <button 
              className="error-close" 
              onClick={() => setError('')}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* Enhanced Controls */}
        <div className="enhanced-controls">
          <div className="control-row">
            <div className="search-section">
              <input
                type="text"
                placeholder="🔍 Smart search tasks, categories, tags..."
                value={currentState.searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="enhanced-search-input"
              />
            </div>

            <div className="mode-toggles">
              <button
                className={`mode-btn ${currentState.bulkOperationMode ? 'active' : ''}`}
                onClick={() => stateManager.setState({ 
                  bulkOperationMode: !currentState.bulkOperationMode,
                  selectedTasks: new Set()
                })}
                title="Toggle bulk operations (Ctrl+B)"
              >
                📦 Bulk Mode
              </button>
              
              <button
                className="mode-btn"
                onClick={() => setShowProgressTracker(true)}
                title="Open progress tracker"
              >
                📊 Analytics
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {currentState.bulkOperationMode && currentState.selectedTasks.size > 0 && (
            <div className="bulk-actions">
              <span className="bulk-count">
                {currentState.selectedTasks.size} selected
              </span>
              <button
                className="bulk-btn complete"
                onClick={() => handleBulkOperation('complete', Array.from(currentState.selectedTasks))}
                disabled={isLoading}
              >
                ✅ Complete All
              </button>
              <button
                className="bulk-btn delete"
                onClick={() => handleBulkOperation('delete', Array.from(currentState.selectedTasks))}
                disabled={isLoading}
              >
                🗑️ Delete All
              </button>
            </div>
          )}
        </div>

        {/* Add Task Section */}
        <div className="add-task-section enhanced">
          <div className="add-task-form">
            <input
              type="text"
              className="task-input enhanced"
              placeholder="What needs to be done? (Ctrl+Enter to add)"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleAddTask()}
              disabled={isLoading}
            />
            
            <select
              className="task-select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {Object.entries(TASK_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>

            <select
              className="task-select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
            >
              {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                <option key={key} value={key}>
                  {priority.icon} {priority.label}
                </option>
              ))}
            </select>

            <button 
              className="add-btn enhanced"
              onClick={handleAddTask}
              disabled={isLoading || !newTask.trim()}
            >
              {isLoading ? '⏳' : '🚀'} Add Task
            </button>
          </div>
        </div>

        {/* Enhanced Task List */}
        <div className="tasks-section enhanced">
          <div className="tasks-header">
            <h2>📋 Tasks ({filteredAndSortedTasks.length})</h2>
            {taskStats.completionRate > 0 && (
              <div className="completion-indicator">
                <div 
                  className="completion-bar" 
                  style={{ width: `${taskStats.completionRate}%` }}
                />
                <span className="completion-text">{taskStats.completionRate}% Complete</span>
              </div>
            )}
          </div>

          {filteredAndSortedTasks.length === 0 ? (
            <div className="empty-state enhanced">
              <div className="empty-icon">🎯</div>
              <h3>Ready to be productive?</h3>
              <p>Add your first task above to get started with enhanced task management.</p>
            </div>
          ) : (
            <div className="tasks-list enhanced">
              {filteredAndSortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-item enhanced ${task.completed ? 'completed' : ''} ${
                    currentState.selectedTasks.has(task.id) ? 'selected' : ''
                  }`}
                >
                  {currentState.bulkOperationMode && (
                    <input
                      type="checkbox"
                      className="task-selector"
                      checked={currentState.selectedTasks.has(task.id)}
                      onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                    />
                  )}
                  
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                  />
                  
                  <div className="task-content enhanced">
                    <div className="task-text">{task.text}</div>
                    <div className="task-meta">
                      <span className={`priority-badge ${task.priority}`}>
                        {PRIORITY_LEVELS[task.priority]?.icon} {PRIORITY_LEVELS[task.priority]?.label}
                      </span>
                      <span className={`category-badge ${task.category}`}>
                        {TASK_CATEGORIES[task.category]?.icon} {TASK_CATEGORIES[task.category]?.label}
                      </span>
                      {task.dueDate && (
                        <span className="due-date">
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress Tracker Modal */}
        {showProgressTracker && (
          <ProgressTracker
            tasks={tasks}
            onClose={() => setShowProgressTracker(false)}
            enhancedStats={taskStats}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedTaskManager;
