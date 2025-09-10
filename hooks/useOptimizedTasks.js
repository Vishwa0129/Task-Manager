import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { TaskAnalytics, validateTask, sortTasks, filterTasks } from '../utils/taskUtils';
import { performanceMonitor, memoize } from '../utils/performance';

// Advanced memoized task operations
const memoizedTaskOperations = {
  calculateStats: memoize((tasks) => {
    return performanceMonitor.measure(() => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pending = total - completed;
      const overdue = tasks.filter(t => 
        !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
      ).length;
      
      return {
        total,
        completed,
        pending,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }, 'calculateStats');
  }),
  
  filterAndSort: memoize((tasks, filters, sortBy) => {
    return performanceMonitor.measure(() => {
      let filtered = filterTasks(tasks, filters.status);
      
      if (filters.category !== 'all') {
        filtered = filtered.filter(task => task.category === filters.category);
      }
      
      if (filters.priority !== 'all') {
        filtered = filtered.filter(task => task.priority === filters.priority);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(task => 
          task.text.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.category.toLowerCase().includes(searchLower)
        );
      }
      
      return sortTasks(filtered, sortBy);
    }, 'filterAndSort');
  }),
  
  getAnalytics: memoize((tasks) => {
    return performanceMonitor.measure(() => {
      const analytics = new TaskAnalytics(tasks);
      return {
        productivityScore: analytics.calculateProductivityScore(tasks),
        categoryBreakdown: analytics.getCategoryBreakdown(),
        priorityBreakdown: analytics.getPriorityBreakdown(),
        completionTrends: analytics.getCompletionTrends(),
        streak: analytics.calculateStreak(tasks)
      };
    }, 'getAnalytics');
  })
};

// Advanced task management hook with optimizations
export const useOptimizedTasks = () => {
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // Performance tracking
  const renderCount = useRef(0);
  const operationQueue = useRef([]);
  const batchTimeout = useRef(null);
  
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current > 50) {
      console.warn('High render count detected:', renderCount.current);
    }
  });

  // Batch operations for better performance
  const batchOperation = useCallback((operation) => {
    operationQueue.current.push(operation);
    
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
    }
    
    batchTimeout.current = setTimeout(() => {
      const operations = [...operationQueue.current];
      operationQueue.current = [];
      
      setTasks(currentTasks => {
        let updatedTasks = [...currentTasks];
        operations.forEach(op => {
          updatedTasks = op(updatedTasks);
        });
        return updatedTasks;
      });
      
      setLastUpdate(Date.now());
    }, 16); // ~60fps batching
  }, [setTasks]);

  // Optimized task operations
  const addTask = useCallback((taskData) => {
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
      tags: taskData.tags || [],
      description: taskData.description || '',
      estimatedTime: taskData.estimatedTime || null,
      actualTime: null,
      order: Date.now()
    };

    batchOperation(tasks => [...tasks, newTask]);
    return newTask;
  }, [batchOperation]);

  const updateTask = useCallback((id, updates) => {
    batchOperation(tasks => 
      tasks.map(task => 
        task.id === id 
          ? { 
              ...task, 
              ...updates, 
              updatedAt: new Date().toISOString() 
            }
          : task
      )
    );
  }, [batchOperation]);

  const deleteTask = useCallback((id) => {
    batchOperation(tasks => tasks.filter(task => task.id !== id));
  }, [batchOperation]);

  const toggleTask = useCallback((id) => {
    batchOperation(tasks => 
      tasks.map(task => 
        task.id === id 
          ? { 
              ...task, 
              completed: !task.completed,
              completedAt: !task.completed ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString()
            }
          : task
      )
    );
  }, [batchOperation]);

  const bulkUpdate = useCallback((taskIds, updates) => {
    batchOperation(tasks => 
      tasks.map(task => 
        taskIds.includes(task.id)
          ? { 
              ...task, 
              ...updates, 
              updatedAt: new Date().toISOString() 
            }
          : task
      )
    );
  }, [batchOperation]);

  const reorderTasks = useCallback((startIndex, endIndex) => {
    batchOperation(tasks => {
      const result = Array.from(tasks);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Update order values
      return result.map((task, index) => ({
        ...task,
        order: index,
        updatedAt: new Date().toISOString()
      }));
    });
  }, [batchOperation]);

  // Editing state management
  const startEditing = useCallback((id, text) => {
    setEditingId(id);
    setEditingText(text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  const saveEditing = useCallback(() => {
    if (editingId && editingText.trim()) {
      updateTask(editingId, { text: editingText.trim() });
    }
    cancelEditing();
  }, [editingId, editingText, updateTask, cancelEditing]);

  // Memoized computed values
  const taskStats = useMemo(() => 
    memoizedTaskOperations.calculateStats(tasks), 
    [tasks, lastUpdate]
  );

  const getFilteredTasks = useCallback((filters, sortBy) => 
    memoizedTaskOperations.filterAndSort(tasks, filters, sortBy),
    [tasks, lastUpdate]
  );

  const analytics = useMemo(() => 
    memoizedTaskOperations.getAnalytics(tasks),
    [tasks, lastUpdate]
  );

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    taskCount: tasks.length,
    renderCount: renderCount.current,
    lastUpdate,
    memoryUsage: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576)
    } : null
  }), [tasks.length, lastUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  return {
    // Core data
    tasks,
    taskStats,
    analytics,
    performanceMetrics,
    
    // Editing state
    editingId,
    editingText,
    setEditingText,
    
    // Task operations
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    bulkUpdate,
    reorderTasks,
    getFilteredTasks,
    
    // Editing operations
    startEditing,
    cancelEditing,
    saveEditing,
    
    // Utility
    setTasks // For advanced operations like import/export
  };
};
