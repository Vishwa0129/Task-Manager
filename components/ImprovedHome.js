import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAdvancedTasks } from '../hooks/useAdvancedTasks';
import SmartTaskInput from './SmartTaskInput';
import TaskFilters from './TaskFilters';
import { TASK_CATEGORIES, PRIORITY_LEVELS, TaskAnalytics } from '../utils/taskUtils';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/enhancedPerformance';
import '../styles/improvedHome.css';
import '../styles/smartComponents.css';

const ImprovedHome = () => {
  const { user, logout } = useAuth();
  const { currentTheme, theme, themes, changeTheme } = useTheme();
  const {
    tasks,
    isLoading,
    error,
    taskStats,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    bulkUpdate,
    bulkDelete,
    undo,
    redo,
    canUndo,
    canRedo,
    exportTasks,
    importTasks,
    clearError
  } = useAdvancedTasks();

  // UI State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    priority: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.startMonitoring();
    logger.info('ImprovedHome component mounted');
    
    return () => {
      performanceMonitor.stopMonitoring();
    };
  }, []);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.text.toLowerCase().includes(searchTerm) ||
        task.description?.toLowerCase().includes(searchTerm) ||
        task.category.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    switch (filters.status) {
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => 
          !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
        );
        break;
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(task => task.category === filters.category);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'text':
          comparison = a.text.localeCompare(b.text);
          break;
        case 'priority':
          const priorityA = PRIORITY_LEVELS[a.priority]?.weight || 0;
          const priorityB = PRIORITY_LEVELS[b.priority]?.weight || 0;
          comparison = priorityB - priorityA;
          break;
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate) - new Date(b.dueDate);
          break;
        case 'createdAt':
        default:
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
          break;
      }

      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, filters]);

  // Handlers
  const handleAddTask = useCallback(async (taskData) => {
    try {
      await addTask(taskData);
      logger.userAction('task-added', { category: taskData.category });
    } catch (error) {
      logger.error('Failed to add task', { error });
    }
  }, [addTask]);

  const handleToggleTask = useCallback(async (taskId) => {
    try {
      await toggleTask(taskId);
      logger.userAction('task-toggled', { taskId });
    } catch (error) {
      logger.error('Failed to toggle task', { error });
    }
  }, [toggleTask]);

  const handleDeleteTask = useCallback(async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        setSelectedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        logger.userAction('task-deleted', { taskId });
      } catch (error) {
        logger.error('Failed to delete task', { error });
      }
    }
  }, [deleteTask]);

  const handleBulkAction = useCallback(async (action) => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) return;

    try {
      switch (action) {
        case 'complete':
          await bulkUpdate(taskIds, { completed: true });
          break;
        case 'incomplete':
          await bulkUpdate(taskIds, { completed: false });
          break;
        case 'delete':
          if (window.confirm(`Delete ${taskIds.length} selected tasks?`)) {
            await bulkDelete(taskIds);
          }
          break;
        case 'high-priority':
          await bulkUpdate(taskIds, { priority: 'high' });
          break;
        case 'medium-priority':
          await bulkUpdate(taskIds, { priority: 'medium' });
          break;
        case 'low-priority':
          await bulkUpdate(taskIds, { priority: 'low' });
          break;
      }
      setSelectedTasks(new Set());
      logger.userAction('bulk-action', { action, count: taskIds.length });
    } catch (error) {
      logger.error('Bulk action failed', { error, action });
    }
  }, [selectedTasks, bulkUpdate, bulkDelete]);

  const handleTaskSelect = useCallback((taskId, selected) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)));
    }
  }, [selectedTasks.size, filteredTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'a':
            if (bulkMode) {
              e.preventDefault();
              handleSelectAll();
            }
            break;
          case 'b':
            e.preventDefault();
            setBulkMode(!bulkMode);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [bulkMode, undo, redo, handleSelectAll]);

  const getThemeIcon = (themeName) => {
    const icons = {
      dark: '🌙',
      light: '☀️',
      ocean: '🌊',
      sunset: '🌅',
      forest: '🌲',
      purple: '💜',
      cyberpunk: '🤖',
      midnight: '🌌',
      rose: '🌹',
      arctic: '❄️',
      neon: '⚡',
      autumn: '🍂',
      monochrome: '⚫'
    };
    return icons[themeName] || '🎨';
  };

  return (
    <div className="improved-home">
      {/* Header */}
      <header className="home-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">✨</span>
            TaskFlow Manager
            <span className="version-badge">v2.0</span>
          </h1>
          <div className="user-info">
            <div className="welcome-text">Welcome back, <strong>{user?.name || 'User'}</strong></div>
            <div className="quick-stats">
              <span className="stat-item">📋 {taskStats.total} tasks</span>
              <span className="stat-item">✅ {taskStats.completionRate}% complete</span>
              <span className="stat-item">⚡ {TaskAnalytics.calculateProductivityScore(tasks)} score</span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Theme Selector */}
          <div className="theme-selector">
            <button
              className="theme-toggle-btn"
              onClick={() => setShowThemeSelector(!showThemeSelector)}
            >
              {getThemeIcon(currentTheme)} Theme
            </button>
            {showThemeSelector && (
              <div className="theme-dropdown">
                {themes.map(themeName => (
                  <button
                    key={themeName}
                    className={`theme-option ${currentTheme === themeName ? 'active' : ''}`}
                    onClick={() => {
                      changeTheme(themeName);
                      setShowThemeSelector(false);
                    }}
                  >
                    {getThemeIcon(themeName)} {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats Toggle */}
          <button
            className="stats-btn"
            onClick={() => setShowStats(!showStats)}
          >
            📊 Stats
          </button>

          {/* Undo/Redo */}
          <div className="history-controls">
            <button
              className="history-btn"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              className="history-btn"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷
            </button>
          </div>

          {/* Bulk Mode Toggle */}
          <button
            className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
            onClick={() => setBulkMode(!bulkMode)}
            title="Bulk Mode (Ctrl+B)"
          >
            {bulkMode ? '✓' : '☐'} Bulk
          </button>

          <button className="logout-btn" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-text">⚠️ {error}</span>
          <button className="error-close" onClick={clearError}>✕</button>
        </div>
      )}

      {/* Stats Panel */}
      {showStats && (
        <div className="stats-panel">
          <h3>📈 Task Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{taskStats.total}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{taskStats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{taskStats.completionRate}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{taskStats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="home-main">
        {/* Task Input */}
        <SmartTaskInput
          onAddTask={handleAddTask}
          isLoading={isLoading}
        />

        {/* Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          taskStats={taskStats}
          onExport={exportTasks}
          onImport={importTasks}
        />

        {/* Bulk Actions */}
        {bulkMode && selectedTasks.size > 0 && (
          <div className="bulk-actions">
            <div className="bulk-info">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </div>
            <div className="bulk-buttons">
              <button onClick={() => handleBulkAction('complete')}>
                ✓ Complete
              </button>
              <button onClick={() => handleBulkAction('incomplete')}>
                ○ Incomplete
              </button>
              <button onClick={() => handleBulkAction('high-priority')}>
                🔴 High Priority
              </button>
              <button onClick={() => handleBulkAction('medium-priority')}>
                🟡 Medium Priority
              </button>
              <button onClick={() => handleBulkAction('low-priority')}>
                🟢 Low Priority
              </button>
              <button 
                onClick={() => handleBulkAction('delete')}
                className="danger"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="task-list-container">
          {isLoading && (
            <div className="loading-indicator">
              <div className="spinner-advanced">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <span>Loading tasks...</span>
            </div>
          )}

          {filteredTasks.length === 0 && !isLoading ? (
            <div className="empty-state">
              <div className="empty-animation">
                <div className="empty-icon">📝</div>
                <div className="floating-elements">
                  <span className="float-1">✨</span>
                  <span className="float-2">📋</span>
                  <span className="float-3">⚡</span>
                </div>
              </div>
              <h3>No tasks found</h3>
              <p>
                {filters.search || filters.status !== 'all' || filters.category !== 'all' || filters.priority !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Add your first task to get started on your productivity journey!'}
              </p>
              {!filters.search && filters.status === 'all' && (
                <div className="quick-add-suggestions">
                  <p>Quick suggestions:</p>
                  <div className="suggestion-buttons">
                    <button onClick={() => handleAddTask({ text: 'Review daily emails', category: 'work' })}>
                      📧 Review emails
                    </button>
                    <button onClick={() => handleAddTask({ text: 'Take a 30-minute walk', category: 'health' })}>
                      🚶 Take a walk
                    </button>
                    <button onClick={() => handleAddTask({ text: 'Plan tomorrow', category: 'personal' })}>
                      📅 Plan tomorrow
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`task-item ${task.completed ? 'completed' : ''} ${
                    selectedTasks.has(task.id) ? 'selected' : ''
                  } ${task.priority === 'high' ? 'high-priority' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {bulkMode && (
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
                    />
                  )}

                  <div className="task-status-indicator">
                    <div className={`status-dot ${task.completed ? 'completed' : 'pending'}`}></div>
                  </div>

                  <div className="task-content" onClick={() => handleToggleTask(task.id)}>
                    <div className="task-main">
                      <div className="task-text">
                        {task.text}
                        {task.completed && <span className="completion-badge">✓</span>}
                      </div>
                      {task.description && (
                        <div className="task-description">{task.description}</div>
                      )}
                    </div>

                    <div className="task-meta">
                      <span className={`category-badge ${task.category}`}>
                        {TASK_CATEGORIES[task.category]?.icon} {TASK_CATEGORIES[task.category]?.label}
                      </span>
                      <span className={`priority-badge ${task.priority}`}>
                        {PRIORITY_LEVELS[task.priority]?.icon} {PRIORITY_LEVELS[task.priority]?.label}
                      </span>
                      {task.dueDate && (
                        <span className={`due-date ${new Date(task.dueDate) < new Date() && !task.completed ? 'overdue' : ''}`}>
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                          {new Date(task.dueDate) < new Date() && !task.completed && (
                            <span className="overdue-indicator">⚠️</span>
                          )}
                        </span>
                      )}
                      {task.estimatedTime && (
                        <span className="estimated-time">
                          ⏱️ {task.estimatedTime}min
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="task-tags">
                          {task.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="task-tag">#{tag}</span>
                          ))}
                          {task.tags.length > 2 && (
                            <span className="more-tags">+{task.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      title="Edit task"
                    >
                      ✏️
                    </button>
                    <button
                      className="action-btn duplicate-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTask({ ...task, text: `${task.text} (copy)`, id: undefined });
                      }}
                      title="Duplicate task"
                    >
                      📋
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      title="Delete task"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Progress bar for tasks with estimated time */}
                  {task.estimatedTime && task.actualTime && (
                    <div className="task-progress">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${Math.min((task.actualTime / task.estimatedTime) * 100, 100)}%`,
                          backgroundColor: task.actualTime > task.estimatedTime ? 'var(--color-warning)' : 'var(--color-success)'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Keyboard Shortcuts Help */}
      <div className="shortcuts-help">
        <details>
          <summary>⌨️ Keyboard Shortcuts</summary>
          <div className="shortcuts-list">
            <div><kbd>Ctrl+Z</kbd> Undo</div>
            <div><kbd>Ctrl+Shift+Z</kbd> Redo</div>
            <div><kbd>Ctrl+B</kbd> Toggle Bulk Mode</div>
            <div><kbd>Ctrl+A</kbd> Select All (in bulk mode)</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ImprovedHome;
