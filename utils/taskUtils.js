// Task utility functions for better code organization
export const TASK_CATEGORIES = {
  general: { icon: '📝', color: '#64b5f6', label: 'General' },
  work: { icon: '💼', color: '#ff7043', label: 'Work' },
  personal: { icon: '👤', color: '#ab47bc', label: 'Personal' },
  health: { icon: '🏥', color: '#66bb6a', label: 'Health' },
  finance: { icon: '💰', color: '#ffa726', label: 'Finance' },
  education: { icon: '📚', color: '#42a5f5', label: 'Education' },
  shopping: { icon: '🛒', color: '#ec407a', label: 'Shopping' },
  other: { icon: '📌', color: '#78909c', label: 'Other' }
};

export const PRIORITY_LEVELS = {
  low: { icon: '🟢', color: '#4caf50', label: 'Low', weight: 1 },
  medium: { icon: '🟡', color: '#ff9800', label: 'Medium', weight: 2 },
  high: { icon: '🔴', color: '#f44336', label: 'High', weight: 3 }
};

export const TASK_TEMPLATES = [
  { text: 'Review daily emails', category: 'work', priority: 'medium', estimatedTime: 15, description: 'Check and respond to important emails' },
  { text: 'Take a 30-minute walk', category: 'health', priority: 'low', estimatedTime: 30, description: 'Outdoor exercise for physical wellness' },
  { text: 'Pay monthly bills', category: 'finance', priority: 'high', estimatedTime: 20, description: 'Review and pay recurring monthly expenses' },
  { text: 'Buy groceries', category: 'shopping', priority: 'medium', estimatedTime: 45, description: 'Weekly grocery shopping trip' },
  { text: 'Read for 30 minutes', category: 'education', priority: 'low', estimatedTime: 30, description: 'Personal development reading time' },
  { text: 'Call family member', category: 'personal', priority: 'medium', estimatedTime: 20, description: 'Stay connected with family' },
  { text: 'Workout session', category: 'health', priority: 'medium', estimatedTime: 60, description: 'Strength training or cardio workout' },
  { text: 'Team meeting', category: 'work', priority: 'high', estimatedTime: 60, description: 'Weekly team sync and planning' },
  { text: 'Meal prep', category: 'personal', priority: 'medium', estimatedTime: 90, description: 'Prepare meals for the week ahead' }
];

// Task validation utilities
export const validateTask = (task) => {
  const errors = {};
  
  if (!task.text || task.text.trim().length === 0) {
    errors.text = 'Task text is required';
  }
  
  if (task.text && task.text.length > 200) {
    errors.text = 'Task text must be less than 200 characters';
  }
  
  if (task.category && !TASK_CATEGORIES[task.category]) {
    errors.category = 'Invalid category';
  }
  
  if (task.priority && !PRIORITY_LEVELS[task.priority]) {
    errors.priority = 'Invalid priority';
  }
  
  if (task.dueDate && new Date(task.dueDate) < new Date()) {
    errors.dueDate = 'Due date cannot be in the past';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Task sorting and filtering utilities
export const sortTasks = (tasks, sortBy) => {
  const sortedTasks = [...tasks];
  
  switch (sortBy) {
    case 'priority':
      return sortedTasks.sort((a, b) => {
        const priorityA = PRIORITY_LEVELS[a.priority]?.weight || 0;
        const priorityB = PRIORITY_LEVELS[b.priority]?.weight || 0;
        return priorityB - priorityA;
      });
    case 'dueDate':
      return sortedTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    case 'createdAt':
      return sortedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'updatedAt':
      return sortedTasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    case 'text':
      return sortedTasks.sort((a, b) => a.text.localeCompare(b.text));
    case 'order':
    default:
      return sortedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
};

export const filterTasks = (tasks, filter) => {
  switch (filter) {
    case 'completed':
      return tasks.filter(task => task.completed);
    case 'pending':
      return tasks.filter(task => !task.completed);
    case 'overdue':
      return tasks.filter(task => 
        !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
      );
    case 'today':
      const today = new Date().toDateString();
      return tasks.filter(task => 
        task.dueDate && new Date(task.dueDate).toDateString() === today
      );
    case 'all':
    default:
      return tasks;
  }
};

// Task analytics utilities
export const TaskAnalytics = {
  calculateProductivityScore: (tasks) => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
    
    if (total === 0) return 100;
    const baseScore = (completed / total) * 100;
    const penalty = (overdue / total) * 20;
    return Math.max(0, Math.round(baseScore - penalty));
  },

  getTasksByTimeOfDay: (tasks) => {
    const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    
    tasks.forEach(task => {
      const hour = new Date(task.createdAt).getHours();
      if (hour >= 5 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
      else if (hour >= 17 && hour < 22) timeSlots.evening++;
      else timeSlots.night++;
    });
    
    return timeSlots;
  },

  getPredictedCompletionTime: (tasks, category) => {
    const categoryTasks = tasks.filter(t => t.category === category && t.completed && t.actualTime);
    if (categoryTasks.length === 0) return null;
    
    const avgTime = categoryTasks.reduce((sum, t) => sum + t.actualTime, 0) / categoryTasks.length;
    return Math.round(avgTime);
  },

  getCompletionStreak: (tasks) => {
    const completedTasks = tasks
      .filter(t => t.completed)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    let streak = 0;
    let currentDate = new Date().toDateString();
    
    for (const task of completedTasks) {
      const taskDate = new Date(task.updatedAt).toDateString();
      if (taskDate === currentDate) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
};

// Date formatting utilities
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString();
  }
};

export const formatTime = (minutes) => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

// Debounce utility for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
