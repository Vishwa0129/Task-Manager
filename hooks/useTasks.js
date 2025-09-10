import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { validateTask } from '../utils/taskUtils';

// Enhanced task management hook with better performance and error handling
export const useTasks = () => {
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Memoized task statistics for performance
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(task => 
      !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
    ).length;
    
    return { total, completed, pending, overdue };
  }, [tasks]);

  // Add task with validation
  const addTask = useCallback((taskData) => {
    const validation = validateTask(taskData);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors).join(', '));
    }

    const newTask = {
      id: Date.now() + Math.random(),
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
      actualTime: taskData.actualTime || null,
      order: tasks.length + 1,
      subtasks: taskData.subtasks || [],
      attachments: taskData.attachments || [],
      notes: taskData.notes || ''
    };

    setTasks(prevTasks => [...prevTasks, newTask]);
    return newTask;
  }, [tasks.length, setTasks]);

  // Update task with validation
  const updateTask = useCallback((id, updates) => {
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === id) {
          const updatedTask = { 
            ...task, 
            ...updates, 
            updatedAt: new Date().toISOString() 
          };
          
          const validation = validateTask(updatedTask);
          if (!validation.isValid) {
            throw new Error(Object.values(validation.errors).join(', '));
          }
          
          return updatedTask;
        }
        return task;
      })
    );
  }, [setTasks]);

  // Delete task
  const deleteTask = useCallback((id) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  }, [setTasks]);

  // Toggle task completion
  const toggleTask = useCallback((id) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id 
          ? { 
              ...task, 
              completed: !task.completed,
              updatedAt: new Date().toISOString(),
              actualTime: !task.completed && task.estimatedTime ? task.estimatedTime : task.actualTime
            }
          : task
      )
    );
  }, [setTasks]);

  // Move task (for drag and drop)
  const moveTask = useCallback((dragIndex, hoverIndex) => {
    setTasks(prevTasks => {
      const dragTask = prevTasks[dragIndex];
      const newTasks = [...prevTasks];
      newTasks.splice(dragIndex, 1);
      newTasks.splice(hoverIndex, 0, dragTask);
      
      // Update order for all tasks
      return newTasks.map((task, index) => ({
        ...task,
        order: index + 1,
        updatedAt: new Date().toISOString()
      }));
    });
  }, [setTasks]);

  // Bulk operations
  const bulkUpdateTasks = useCallback((taskIds, updates) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        taskIds.includes(task.id)
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );
  }, [setTasks]);

  const bulkDeleteTasks = useCallback((taskIds) => {
    setTasks(prevTasks => prevTasks.filter(task => !taskIds.includes(task.id)));
  }, [setTasks]);

  // Replace all tasks (for import/export)
  const replaceTasks = useCallback((newTasks) => {
    const validatedTasks = Array.isArray(newTasks) 
      ? newTasks.map((task, index) => {
          const validation = validateTask(task);
          if (!validation.isValid) {
            console.warn(`Invalid task at index ${index}:`, validation.errors);
            return null;
          }
          
          return {
            id: task.id ?? Date.now() + Math.random(),
            text: String(task.text ?? '').trim(),
            completed: !!task.completed,
            createdAt: task.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            category: task.category ?? 'general',
            priority: task.priority ?? 'medium',
            dueDate: task.dueDate ?? null,
            tags: Array.isArray(task.tags) ? task.tags : [],
            description: task.description ?? '',
            estimatedTime: task.estimatedTime ?? null,
            actualTime: task.actualTime ?? null,
            order: typeof task.order === 'number' ? task.order : index + 1,
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            attachments: Array.isArray(task.attachments) ? task.attachments : [],
            notes: task.notes ?? ''
          };
        }).filter(Boolean)
      : [];
    
    setTasks(validatedTasks);
  }, [setTasks]);

  // Reset task order
  const resetOrder = useCallback(() => {
    setTasks(prevTasks => 
      prevTasks.map((task, index) => ({
        ...task,
        order: index + 1,
        updatedAt: new Date().toISOString()
      }))
    );
  }, [setTasks]);

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
      cancelEditing();
    }
  }, [editingId, editingText, updateTask, cancelEditing]);

  return {
    tasks,
    taskStats,
    editingId,
    editingText,
    setEditingText,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    moveTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    replaceTasks,
    resetOrder,
    startEditing,
    cancelEditing,
    saveEditing
  };
};
