// Progress Export and Sharing Utilities

import { TaskAnalytics, formatDate } from './taskUtils';

// Export progress data to JSON
export const exportProgressData = (tasks) => {
  const now = new Date();
  const analytics = new TaskAnalytics(tasks);
  
  const progressData = {
    exportDate: now.toISOString(),
    exportVersion: '1.0',
    summary: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      completionRate: analytics.getCompletionRate(),
      productivityScore: analytics.calculateProductivityScore(tasks),
      categories: analytics.getCategoryBreakdown(),
      priorities: analytics.getPriorityBreakdown()
    },
    dailyProgress: generateDailyProgress(tasks, 30), // Last 30 days
    weeklyProgress: generateWeeklyProgress(tasks, 12), // Last 12 weeks
    monthlyProgress: generateMonthlyProgress(tasks, 6), // Last 6 months
    streakData: calculateStreakData(tasks),
    goalProgress: calculateGoalProgress(tasks),
    tasks: tasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: task.completed,
      category: task.category,
      priority: task.priority,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
      actualTime: task.actualTime
    }))
  };
  
  return progressData;
};

// Generate daily progress for the last N days
const generateDailyProgress = (tasks, days) => {
  const dailyData = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startOfDay && taskDate < endOfDay;
    });
    
    const completed = dayTasks.filter(t => t.completed).length;
    const total = dayTasks.length;
    
    dailyData.push({
      date: startOfDay.toISOString().split('T')[0],
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }
  
  return dailyData;
};

// Generate weekly progress for the last N weeks
const generateWeeklyProgress = (tasks, weeks) => {
  const weeklyData = [];
  const now = new Date();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + (i * 7)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= weekStart && taskDate < weekEnd;
    });
    
    const completed = weekTasks.filter(t => t.completed).length;
    const total = weekTasks.length;
    
    weeklyData.push({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: new Date(weekEnd.getTime() - 1).toISOString().split('T')[0],
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }
  
  return weeklyData;
};

// Generate monthly progress for the last N months
const generateMonthlyProgress = (tasks, months) => {
  const monthlyData = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    const monthTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= monthStart && taskDate <= monthEnd;
    });
    
    const completed = monthTasks.filter(t => t.completed).length;
    const total = monthTasks.length;
    
    monthlyData.push({
      month: monthStart.toISOString().split('T')[0].substring(0, 7), // YYYY-MM format
      monthName: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      total,
      completed,
      pending: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }
  
  return monthlyData;
};

// Calculate streak data
const calculateStreakData = (tasks) => {
  const completedTasks = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let streakDates = [];
  
  if (completedTasks.length > 0) {
    // Group tasks by date
    const tasksByDate = {};
    completedTasks.forEach(task => {
      const date = new Date(task.completedAt).toDateString();
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    });
    
    const dates = Object.keys(tasksByDate).sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Calculate current streak
    let streakActive = false;
    if (dates.length > 0) {
      if (dates[0] === today || dates[0] === yesterday.toDateString()) {
        streakActive = true;
        currentStreak = 1;
        streakDates.push(dates[0]);
        
        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(dates[i-1]);
          const nextDate = new Date(dates[i]);
          const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            currentStreak++;
            streakDates.push(dates[i]);
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate longest streak
    let tempStreak = 1;
    let tempDates = [dates[0]];
    
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i-1]);
      const nextDate = new Date(dates[i]);
      const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
        tempDates.push(dates[i]);
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
        tempDates = [dates[i]];
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }
  
  return {
    current: currentStreak,
    longest: longestStreak,
    isActive: currentStreak > 0,
    streakDates: streakDates.slice(0, currentStreak)
  };
};

// Calculate goal progress
const calculateGoalProgress = (tasks) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay());
  
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= today;
  });
  
  const weekTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate >= thisWeek;
  });
  
  const streakData = calculateStreakData(tasks);
  
  return {
    daily: {
      target: 5,
      completed: todayTasks.filter(t => t.completed).length,
      progress: Math.min((todayTasks.filter(t => t.completed).length / 5) * 100, 100)
    },
    weekly: {
      target: 80, // 80% completion rate
      completionRate: weekTasks.length > 0 ? Math.round((weekTasks.filter(t => t.completed).length / weekTasks.length) * 100) : 0,
      progress: Math.min((weekTasks.length > 0 ? (weekTasks.filter(t => t.completed).length / weekTasks.length) * 100 : 0) / 80 * 100, 100)
    },
    streak: {
      target: 7,
      current: streakData.current,
      progress: Math.min((streakData.current / 7) * 100, 100)
    }
  };
};

// Export to CSV format
export const exportToCSV = (tasks) => {
  const headers = [
    'ID', 'Task', 'Status', 'Category', 'Priority', 'Created Date', 
    'Completed Date', 'Due Date', 'Estimated Time', 'Actual Time'
  ];
  
  const rows = tasks.map(task => [
    task.id,
    `"${task.text.replace(/"/g, '""')}"`, // Escape quotes
    task.completed ? 'Completed' : 'Pending',
    task.category,
    task.priority,
    formatDate(task.createdAt),
    task.completedAt ? formatDate(task.completedAt) : '',
    task.dueDate ? formatDate(task.dueDate) : '',
    task.estimatedTime || '',
    task.actualTime || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  return csvContent;
};

// Generate progress report in markdown format
export const generateProgressReport = (tasks) => {
  const progressData = exportProgressData(tasks);
  const now = new Date();
  
  let report = `# Task Progress Report\n\n`;
  report += `**Generated:** ${formatDate(now.toISOString())}\n\n`;
  
  // Summary
  report += `## 📊 Summary\n\n`;
  report += `- **Total Tasks:** ${progressData.summary.totalTasks}\n`;
  report += `- **Completed Tasks:** ${progressData.summary.completedTasks}\n`;
  report += `- **Completion Rate:** ${progressData.summary.completionRate}%\n`;
  report += `- **Productivity Score:** ${progressData.summary.productivityScore}\n\n`;
  
  // Streak Information
  report += `## 🔥 Streak Information\n\n`;
  report += `- **Current Streak:** ${progressData.streakData.current} days\n`;
  report += `- **Longest Streak:** ${progressData.streakData.longest} days\n`;
  report += `- **Status:** ${progressData.streakData.isActive ? '🔥 Active' : '💤 Inactive'}\n\n`;
  
  // Goal Progress
  report += `## 🎯 Goal Progress\n\n`;
  report += `### Daily Goal (5 tasks)\n`;
  report += `- **Progress:** ${progressData.goalProgress.daily.completed}/${progressData.goalProgress.daily.target} (${Math.round(progressData.goalProgress.daily.progress)}%)\n\n`;
  
  report += `### Weekly Goal (80% completion rate)\n`;
  report += `- **Progress:** ${progressData.goalProgress.weekly.completionRate}% (${Math.round(progressData.goalProgress.weekly.progress)}%)\n\n`;
  
  report += `### Streak Goal (7 days)\n`;
  report += `- **Progress:** ${progressData.goalProgress.streak.current}/${progressData.goalProgress.streak.target} (${Math.round(progressData.goalProgress.streak.progress)}%)\n\n`;
  
  // Category Breakdown
  report += `## 📂 Category Breakdown\n\n`;
  Object.entries(progressData.summary.categories).forEach(([category, stats]) => {
    const completionRate = Math.round((stats.completed / stats.total) * 100);
    report += `- **${category}:** ${stats.completed}/${stats.total} (${completionRate}%)\n`;
  });
  
  report += `\n## 📈 Recent Progress\n\n`;
  const recentDays = progressData.dailyProgress.slice(-7);
  recentDays.forEach(day => {
    report += `- **${formatDate(day.date)}:** ${day.completed}/${day.total} tasks (${day.completionRate}%)\n`;
  });
  
  return report;
};

// Download file utility
export const downloadFile = (content, filename, mimeType = 'application/json') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Share progress data (for web sharing API)
export const shareProgressData = async (tasks) => {
  const report = generateProgressReport(tasks);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Task Progress Report',
        text: 'Check out my productivity progress!',
        url: window.location.href
      });
    } catch (error) {
      console.log('Error sharing:', error);
      // Fallback to copying to clipboard
      await copyToClipboard(report);
    }
  } else {
    // Fallback to copying to clipboard
    await copyToClipboard(report);
  }
};

// Copy to clipboard utility
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

// Generate shareable progress image (canvas-based)
export const generateProgressImage = (progressData) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 800;
  canvas.height = 600;
  
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📊 Task Progress Report', canvas.width / 2, 60);
  
  // Stats
  ctx.font = '24px Arial';
  ctx.fillStyle = '#64b5f6';
  const stats = [
    `Total Tasks: ${progressData.summary.totalTasks}`,
    `Completed: ${progressData.summary.completedTasks}`,
    `Completion Rate: ${progressData.summary.completionRate}%`,
    `Current Streak: ${progressData.streakData.current} days`
  ];
  
  stats.forEach((stat, index) => {
    ctx.fillText(stat, canvas.width / 2, 140 + (index * 40));
  });
  
  // Progress bars
  const barWidth = 300;
  const barHeight = 20;
  const barX = (canvas.width - barWidth) / 2;
  
  // Completion rate bar
  ctx.fillStyle = '#334155';
  ctx.fillRect(barX, 320, barWidth, barHeight);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(barX, 320, (barWidth * progressData.summary.completionRate) / 100, barHeight);
  
  // Goal progress bar
  ctx.fillStyle = '#334155';
  ctx.fillRect(barX, 360, barWidth, barHeight);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(barX, 360, (barWidth * progressData.goalProgress.daily.progress) / 100, barHeight);
  
  // Labels
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText('Overall Progress', canvas.width / 2, 315);
  ctx.fillText('Daily Goal Progress', canvas.width / 2, 355);
  
  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '14px Arial';
  ctx.fillText(`Generated on ${formatDate(new Date().toISOString())}`, canvas.width / 2, canvas.height - 30);
  
  return canvas.toDataURL('image/png');
};

export default {
  exportProgressData,
  exportToCSV,
  generateProgressReport,
  downloadFile,
  shareProgressData,
  generateProgressImage
};
