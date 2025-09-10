import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/enhancedPerformance';
import { validateTask } from '../utils/taskUtils';

// Advanced task management hook with enhanced features
export const useAdvancedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Load tasks from localStorage on mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(Array.isArray(parsedTasks) ? parsedTasks : []);
        logger.info('Tasks loaded from localStorage', { count: parsedTasks.length });
      }
    } catch (error) {
      logger.error('Failed to load tasks from localStorage', { error });
      setError('Failed to load saved tasks');
    }
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      logger.debug('Tasks saved to localStorage', { count: tasks.length });
    } catch (error) {
      logger.error('Failed to save tasks to localStorage', { error });
      setError('Failed to save tasks');
    }
  }, [tasks]);

  // Add task with validation and undo support
  const addTask = useCallback(async (taskData) => {
    setIsLoading(true);
    setError(null);

    try {
      const validation = validateTask(taskData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: taskData.text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: taskData.category || 'general',
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate || null,
        description: taskData.description || '',
        estimatedTime: taskData.estimatedTime || null,
        actualTime: null,
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        attachments: taskData.attachments || [],
        order: tasks.length + 1
      };

      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      setTasks(prev => [...prev, newTask]);
      logger.taskCreated(newTask);
      
      return newTask;
    } catch (error) {
      logger.error('Failed to add task', { error, taskData });
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  // Update task with validation
  const updateTask = useCallback(async (taskId, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const currentTask = tasks[taskIndex];
      const updatedTask = {
        ...currentTask,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const validation = validateTask(updatedTask);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));

      logger.taskUpdated(taskId, updates);
      return updatedTask;
    } catch (error) {
      logger.error('Failed to update task', { error, taskId, updates });
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  // Delete task with undo support
  const deleteTask = useCallback(async (taskId) => {
    setIsLoading(true);
    setError(null);

    try {
      const taskExists = tasks.some(task => task.id === taskId);
      if (!taskExists) {
        throw new Error('Task not found');
      }

      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      setTasks(prev => prev.filter(task => task.id !== taskId));
      logger.taskDeleted(taskId);
    } catch (error) {
      logger.error('Failed to delete task', { error, taskId });
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await updateTask(taskId, { 
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null
    });

    if (!task.completed) {
      logger.taskCompleted(taskId);
    }
  }, [tasks, updateTask]);

  // Bulk operations
  const bulkUpdate = useCallback(async (taskIds, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      const updatedTasks = tasks.map(task => {
        if (taskIds.includes(task.id)) {
          return {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return task;
      });

      setTasks(updatedTasks);
      logger.info('Bulk update completed', { taskIds, updates });
    } catch (error) {
      logger.error('Bulk update failed', { error, taskIds, updates });
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  const bulkDelete = useCallback(async (taskIds) => {
    setIsLoading(true);
    setError(null);

    try {
      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      setTasks(prev => prev.filter(task => !taskIds.includes(task.id)));
      logger.info('Bulk delete completed', { taskIds });
    } catch (error) {
      logger.error('Bulk delete failed', { error, taskIds });
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (undoStack.length === 0) return false;

    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [tasks, ...prev.slice(0, 9)]);
    setUndoStack(prev => prev.slice(0, -1));
    setTasks(previousState);
    
    logger.info('Undo operation performed');
    return true;
  }, [undoStack, tasks]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return false;

    const nextState = redoStack[0];
    setUndoStack(prev => [...prev.slice(-9), tasks]);
    setRedoStack(prev => prev.slice(1));
    setTasks(nextState);
    
    logger.info('Redo operation performed');
    return true;
  }, [redoStack, tasks]);

  // Import/Export functionality
  const exportTasks = useCallback((format = 'json') => {
    try {
      let exportData;
      let filename;
      let mimeType;

      switch (format) {
        case 'csv':
          const headers = ['ID', 'Text', 'Category', 'Priority', 'Completed', 'Due Date', 'Created At'];
          const rows = tasks.map(task => [
            task.id,
            task.text,
            task.category,
            task.priority,
            task.completed ? 'Yes' : 'No',
            task.dueDate || '',
            task.createdAt
          ]);
          exportData = [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
          ).join('\n');
          filename = `tasks_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;

        case 'json':
        default:
          exportData = JSON.stringify(tasks, null, 2);
          filename = `tasks_${Date.now()}.json`;
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.exportAction(format, tasks.length);
      return true;
    } catch (error) {
      logger.error('Export failed', { error, format });
      setError('Failed to export tasks');
      return false;
    }
  }, [tasks]);

  const importTasks = useCallback(async (file, options = {}) => {
    const { merge = false, validate = true } = options;
    
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      let importedTasks;

      if (file.name.endsWith('.json')) {
        importedTasks = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        importedTasks = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, ''));
          return {
            id: values[0] || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: values[1] || 'Imported task',
            category: values[2] || 'general',
            priority: values[3] || 'medium',
            completed: values[4] === 'Yes',
            dueDate: values[5] || null,
            createdAt: values[6] || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
      } else {
        throw new Error('Unsupported file format');
      }

      if (!Array.isArray(importedTasks)) {
        throw new Error('Invalid file format');
      }

      // Validate imported tasks
      const errors = [];
      if (validate) {
        importedTasks.forEach((task, index) => {
          const validation = validateTask(task);
          if (!validation.isValid) {
            errors.push(`Task ${index + 1}: ${validation.errors.join(', ')}`);
          }
        });

        if (errors.length > 0) {
          throw new Error(`Validation errors:\n${errors.join('\n')}`);
        }
      }

      // Save current state for undo
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);

      if (merge) {
        setTasks(prev => [...prev, ...importedTasks]);
      } else {
        setTasks(importedTasks);
      }

      logger.importAction(file.name.split('.').pop(), importedTasks.length, errors.length);
      return { success: true, count: importedTasks.length, errors };
    } catch (error) {
      logger.error('Import failed', { error, filename: file.name });
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  // Computed values
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => 
      !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;
    
    return {
      total,
      completed,
      pending: total - completed,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [tasks]);

  return {
    // State
    tasks,
    isLoading,
    error,
    syncStatus,
    taskStats,
    
    // Actions
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    bulkUpdate,
    bulkDelete,
    
    // Undo/Redo
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    
    // Import/Export
    exportTasks,
    importTasks,
    
    // Utilities
    clearError: () => setError(null),
    clearTasks: () => {
      setUndoStack(prev => [...prev.slice(-9), tasks]);
      setRedoStack([]);
      setTasks([]);
      logger.info('All tasks cleared');
    }
  };
};
