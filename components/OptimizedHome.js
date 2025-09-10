import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { TaskAnalytics, validateTask, sortTasks, filterTasks, TASK_CATEGORIES, PRIORITY_LEVELS } from '../utils/taskUtils';
import { performanceMonitor, debounce, useOptimizedCallback, useOptimizedMemo } from '../utils/performance';
import ProgressTracker from './ProgressTracker';
import ErrorBoundary from './ErrorBoundary';
import './Home.css';

const TASK_TEMPLATES = [
  { text: 'Review daily goals', category: 'work', priority: 'high' },
  { text: 'Exercise for 30 minutes', category: 'health', priority: 'medium' },
  { text: 'Read for 20 minutes', category: 'personal', priority: 'low' },
  { text: 'Plan tomorrow\'s tasks', category: 'work', priority: 'medium' },
  { text: 'Call family/friends', category: 'personal', priority: 'medium' }
];

// Optimized Home component with enhanced performance
const OptimizedHome = () => {
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

  // State management with performance tracking
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEstimatedTime, setNewEstimatedTime] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showProductivityInsights, setShowProductivityInsights] = useState(false);

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startMeasure('home-component-mount');
    return () => {
      performanceMonitor.endMeasure('home-component-mount');
    };
  }, []);

  // Optimized search with debouncing
  const debouncedSearch = useOptimizedCallback(
    (query) => setSearchTerm(query.trim().toLowerCase()),
    [],
    { debounceMs: 250 }
  );

  // Optimized filtered and sorted tasks with TTL caching
  const filteredAndSortedTasks = useOptimizedMemo(() => {
    return performanceMonitor.measure(() => {
      let filtered = tasks;

      // Apply search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        filtered = filtered.filter(task => 
          task.text.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      filtered = filterTasks(filtered, filter);

      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(task => task.category === categoryFilter);
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(task => task.priority === priorityFilter);
      }

      // Sort tasks
      return sortTasks(filtered, sortBy);
    }, 'filter-and-sort-tasks');
  }, [tasks, filter, categoryFilter, priorityFilter, searchTerm, sortBy], { ttl: 1000 });

  // Optimized task statistics with caching
  const taskStats = useOptimizedMemo(() => {
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
      
      // Category statistics
      const categoryStats = tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalTasks,
        completedTasks: completedTasks.length,
        completionRate: Math.round(completionRate),
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        categoryStats,
        streak: 0, // Simplified for now
        productivityScore: Math.round(completionRate)
      };
    }, 'calculate-task-stats');
  }, [tasks], { ttl: 5000 }); // Cache for 5 seconds

  // Optimized productivity insights
  const productivityInsights = useOptimizedMemo(() => {
    return performanceMonitor.measure(() => {
      const completedTasks = tasks.filter(task => task.completed);
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
      
      const overdueTasks = tasks.filter(task => 
        !task.completed && 
        task.dueDate && 
        new Date(task.dueDate) < new Date()
      );
      
      const todayTasks = tasks.filter(task => {
        const today = new Date().toDateString();
        return task.dueDate && new Date(task.dueDate).toDateString() === today;
      });
      
      return {
        productivityScore: Math.round(completionRate),
        completionRate: Math.round(completionRate),
        streak: 0, // Simplified
        todayTasks: todayTasks.length,
        overdueTasks: overdueTasks.length
      };
    }, 'calculate-productivity-insights');
  }, [tasks], { ttl: 10000 }); // Cache for 10 seconds

  // Optimized task addition with validation
  const handleAddTask = useOptimizedCallback(async () => {
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
        estimatedTime: newEstimatedTime ? parseInt(newEstimatedTime) : null
      };

      const validation = validateTask(taskData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      await addTask(taskData);
      
      // Reset form
      setNewTask('');
      setNewCategory('general');
      setNewPriority('medium');
      setNewDueDate('');
      setNewDescription('');
      setNewEstimatedTime('');
      setShowTemplates(false);
    } catch (error) {
      setError(error.message || 'Failed to add task');
    } finally {
      setIsLoading(false);
    }
  }, [newTask, newCategory, newPriority, newDueDate, newDescription, newEstimatedTime, addTask], { debounceMs: 100 });

  // Optimized task operations
  const handleDeleteTask = useOptimizedCallback((id) => {
    try {
      deleteTask(id);
      setShowDeleteConfirm(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    }
  }, [deleteTask]);

  const handleToggleTask = useOptimizedCallback((id) => {
    try {
      toggleTask(id);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to toggle task');
    }
  }, [toggleTask]);

  const handleSaveEditing = useOptimizedCallback(() => {
    try {
      saveEditing();
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save task');
    }
  }, [saveEditing]);

  // Template handling
  const handleUseTemplate = useOptimizedCallback((template) => {
    setNewTask(template.text);
    setNewCategory(template.category);
    setNewPriority(template.priority);
    setShowTemplates(false);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useOptimizedCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'Enter':
          if (newTask.trim()) {
            e.preventDefault();
            handleAddTask();
          }
          break;
        case 't':
          e.preventDefault();
          setShowTemplates(!showTemplates);
          break;
        default:
          break;
      }
    }
    
    if (e.key === 'Escape') {
      setShowTemplates(false);
      setShowDeleteConfirm(null);
      cancelEditing();
    }
  }, [newTask, showTemplates, handleAddTask, cancelEditing]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary>
      <div className="home-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span className="hero-icon">📋</span>
              TaskFlow Manager
            </h1>
            <p className="hero-subtitle">
              Transform your productivity with intelligent task management
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
            </div>
          </div>
          <div className="hero-decoration">
            <div className="floating-card">
              <div className="card-icon">✨</div>
              <div className="card-text">Stay Focused</div>
            </div>
            <div className="floating-card delay-1">
              <div className="card-icon">🎯</div>
              <div className="card-text">Achieve Goals</div>
            </div>
            <div className="floating-card delay-2">
              <div className="card-icon">🚀</div>
              <div className="card-text">Boost Productivity</div>
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

        {/* Productivity Insights Modal */}
        {showProductivityInsights && (
          <div className="modal-overlay" onClick={() => setShowProductivityInsights(false)}>
            <div className="modal-content productivity-insights" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📊 Productivity Insights</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowProductivityInsights(false)}
                  aria-label="Close insights"
                >
                  ×
                </button>
              </div>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon">🎯</div>
                  <div className="insight-number">{productivityInsights.productivityScore}</div>
                  <div className="insight-label">Productivity Score</div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">🔥</div>
                  <div className="insight-number">{productivityInsights.streak}</div>
                  <div className="insight-label">Day Streak</div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">⚡</div>
                  <div className="insight-number">{productivityInsights.completionRate}%</div>
                  <div className="insight-label">Completion Rate</div>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">⏰</div>
                  <div className="insight-number">{productivityInsights.todayTasks}</div>
                  <div className="insight-label">Due Today</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Section */}
        <div className="add-task-section">
          <div className="add-task-header">
            <h2>➕ Add New Task</h2>
            <div className="add-task-actions">
              <button 
                className="template-btn"
                onClick={() => setShowTemplates(!showTemplates)}
                aria-label="Show task templates"
              >
                📋 Templates
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowProductivityInsights(!showProductivityInsights)}
                aria-label="View productivity insights"
              >
                📊 Insights
              </button>
              <button 
                className="progress-btn"
                onClick={() => setShowProgressTracker(true)}
                aria-label="Open progress tracker"
              >
                📈 Progress
              </button>
            </div>
          </div>

          <div className="add-task-form">
            <input
              type="text"
              className="task-input"
              placeholder="What needs to be done?"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              disabled={isLoading}
              aria-label="New task text"
            />
            
            <select
              className="task-category-select"
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
              className="task-priority-select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
            >
              {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                <option key={key} value={key}>
                  {priority.icon} {priority.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="task-due-date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />

            <button 
              className="add-btn"
              onClick={handleAddTask}
              disabled={isLoading || !newTask.trim()}
              aria-label="Add task"
            >
              {isLoading ? '⏳' : '➕'} Add Task
            </button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          <div className="controls-row">
            <div className="search-controls">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => debouncedSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <label className="control-label">Filter:</label>
              <select
                className="control-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter tasks"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due Today</option>
              </select>

              <label className="control-label">Category:</label>
              <select
                className="control-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {Object.entries(TASK_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>

              <label className="control-label">Sort:</label>
              <select
                className="control-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort tasks"
              >
                <option value="order">Custom Order</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="createdAt">Date Created</option>
                <option value="updatedAt">Last Updated</option>
                <option value="text">Alphabetical</option>
              </select>

              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  📋
                </button>
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  ⊞
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="tasks-section">
          <div className="tasks-header">
            <h2>📝 Tasks ({filteredAndSortedTasks.length})</h2>
          </div>

          {filteredAndSortedTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No tasks yet!</h3>
              <p>Add your first task above to get started.</p>
            </div>
          ) : (
            <div className={`tasks-list ${viewMode}`}>
              {filteredAndSortedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-item ${task.completed ? 'completed' : ''}`}
                  data-category={task.category}
                >
                  <div className="task-content">
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      aria-label={`Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`}
                    />
                    
                    <div className="task-details">
                      {editingId === task.id ? (
                        <div className="task-editing">
                          <input
                            type="text"
                            className="task-edit-input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditing();
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                          />
                          <div className="task-edit-actions">
                            <button
                              className="save-btn"
                              onClick={handleSaveEditing}
                              aria-label="Save changes"
                            >
                              ✓
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={cancelEditing}
                              aria-label="Cancel editing"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="task-header">
                            <div className="task-text">{task.text}</div>
                            <div className="task-badges">
                              <span className={`priority-badge priority-${task.priority}`}>
                                {PRIORITY_LEVELS[task.priority]?.icon} {PRIORITY_LEVELS[task.priority]?.label}
                              </span>
                              <span className={`category-badge category-${task.category}`}>
                                {TASK_CATEGORIES[task.category]?.icon} {TASK_CATEGORIES[task.category]?.label}
                              </span>
                              {task.dueDate && (
                                <span className="due-date">
                                  📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.estimatedTime && (
                                <span className="estimated-time">
                                  ⏱️ Est: {task.estimatedTime}min | Created: {new Date(task.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {(task.description || task.estimatedTime) && (
                            <div className="task-meta">
                              {task.description && <span>📄 {task.description}</span>}
                              {task.estimatedTime && <span>⏱️ {task.estimatedTime}min</span>}
                              <span>📅 Created {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="edit-btn"
                      onClick={() => startEditing(task.id, task.text)}
                      aria-label="Edit task"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => setShowDeleteConfirm(task.id)}
                      aria-label="Delete task"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="delete-confirm-modal">
              <div className="delete-confirm-content">
                <h3>Delete Task</h3>
                <p>Are you sure you want to delete this task?</p>
                <div className="delete-confirm-actions">
                  <button 
                    onClick={() => handleDeleteTask(showDeleteConfirm)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Tracker Modal */}
        {showProgressTracker && (
          <ProgressTracker
            tasks={tasks}
            onClose={() => setShowProgressTracker(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedHome;
