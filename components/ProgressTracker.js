import React, { useState, useMemo, useCallback } from 'react';
import './ProgressTracker.css';
import { TaskAnalytics, formatDate, formatTime } from '../utils/taskUtils';
import { 
  exportProgressData, 
  exportToCSV, 
  generateProgressReport, 
  downloadFile, 
  shareProgressData,
  generateProgressImage 
} from '../utils/progressExport';

const ProgressTracker = ({ tasks, onClose }) => {
  const [timeRange, setTimeRange] = useState('week'); // day, week, month, year
  const [viewMode, setViewMode] = useState('overview'); // overview, categories, trends, goals

  // Calculate progress statistics
  const progressStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const getTasksInRange = (start, end = now) => {
      return tasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= start && taskDate <= end;
      });
    };

    const calculateStats = (tasksInRange) => {
      const total = tasksInRange.length;
      const completed = tasksInRange.filter(t => t.completed).length;
      const pending = total - completed;
      const overdue = tasksInRange.filter(t => 
        !t.completed && t.dueDate && new Date(t.dueDate) < now
      ).length;
      
      return {
        total,
        completed,
        pending,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        productivityScore: TaskAnalytics.calculateProductivityScore(tasksInRange)
      };
    };

    return {
      today: calculateStats(getTasksInRange(startOfDay)),
      week: calculateStats(getTasksInRange(startOfWeek)),
      month: calculateStats(getTasksInRange(startOfMonth)),
      year: calculateStats(getTasksInRange(startOfYear)),
      all: calculateStats(tasks)
    };
  }, [tasks]);

  // Calculate daily progress for the last 7 days
  const dailyProgress = useMemo(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
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
      
      days.push({
        date: startOfDay,
        dayName: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
        completed,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    }
    
    return days;
  }, [tasks]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories = {};
    
    tasks.forEach(task => {
      const category = task.category || 'general';
      if (!categories[category]) {
        categories[category] = { total: 0, completed: 0, pending: 0 };
      }
      categories[category].total++;
      if (task.completed) {
        categories[category].completed++;
      } else {
        categories[category].pending++;
      }
    });
    
    return Object.entries(categories).map(([category, stats]) => ({
      category,
      ...stats,
      completionRate: Math.round((stats.completed / stats.total) * 100)
    })).sort((a, b) => b.total - a.total);
  }, [tasks]);

  // Calculate streak information
  const streakInfo = useMemo(() => {
    const completedTasks = tasks
      .filter(t => t.completed && t.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;
    
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Group tasks by date
    const tasksByDate = {};
    completedTasks.forEach(task => {
      const date = new Date(task.completedAt).toDateString();
      if (!tasksByDate[date]) {
        tasksByDate[date] = 0;
      }
      tasksByDate[date]++;
    });
    
    const dates = Object.keys(tasksByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Calculate current streak
    let streakActive = false;
    if (dates.length > 0) {
      if (dates[0] === today) {
        streakActive = true;
        currentStreak = 1;
      } else if (dates[0] === yesterday.toDateString()) {
        streakActive = true;
        currentStreak = 1;
      }
      
      if (streakActive) {
        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(dates[i-1]);
          const nextDate = new Date(dates[i]);
          const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i-1]);
      const nextDate = new Date(dates[i]);
      const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return {
      current: currentStreak,
      longest: longestStreak,
      isActive: streakActive
    };
  }, [tasks]);

  const renderOverview = () => (
    <div className="progress-overview">
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats[timeRange].completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats[timeRange].completed}</div>
            <div className="stat-label">Completed Tasks</div>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats[timeRange].pending}</div>
            <div className="stat-label">Pending Tasks</div>
          </div>
        </div>
        
        <div className="stat-card danger">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats[timeRange].overdue}</div>
            <div className="stat-label">Overdue Tasks</div>
          </div>
        </div>
      </div>

      <div className="progress-charts">
        <div className="chart-container">
          <h3>📊 Daily Progress (Last 7 Days)</h3>
          <div className="daily-chart">
            {dailyProgress.map((day, index) => (
              <div key={index} className="day-bar">
                <div className="bar-container">
                  <div 
                    className="progress-bar"
                    style={{ height: `${Math.max(day.completionRate, 5)}%` }}
                  ></div>
                </div>
                <div className="day-info">
                  <div className="day-name">{day.dayName}</div>
                  <div className="day-stats">{day.completed}/{day.total}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <h3>🔥 Streak Information</h3>
          <div className="streak-info">
            <div className="streak-card">
              <div className="streak-number">{streakInfo.current}</div>
              <div className="streak-label">Current Streak</div>
              <div className="streak-status">
                {streakInfo.isActive ? '🔥 Active' : '💤 Inactive'}
              </div>
            </div>
            <div className="streak-card">
              <div className="streak-number">{streakInfo.longest}</div>
              <div className="streak-label">Longest Streak</div>
              <div className="streak-status">🏆 Personal Best</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="category-breakdown">
      <h3>📂 Category Performance</h3>
      <div className="category-list">
        {categoryBreakdown.map((cat, index) => (
          <div key={index} className="category-item">
            <div className="category-header">
              <span className="category-name">{cat.category}</span>
              <span className="category-rate">{cat.completionRate}%</span>
            </div>
            <div className="category-progress">
              <div 
                className="category-bar"
                style={{ width: `${cat.completionRate}%` }}
              ></div>
            </div>
            <div className="category-stats">
              <span>✅ {cat.completed}</span>
              <span>⏳ {cat.pending}</span>
              <span>📊 {cat.total} total</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="trends-view">
      <h3>📈 Productivity Trends</h3>
      <div className="trend-cards">
        <div className="trend-card">
          <h4>This Week vs Last Week</h4>
          <div className="trend-comparison">
            <div className="trend-stat">
              <span className="trend-label">Completion Rate</span>
              <span className="trend-value">{progressStats.week.completionRate}%</span>
            </div>
            <div className="trend-stat">
              <span className="trend-label">Tasks Completed</span>
              <span className="trend-value">{progressStats.week.completed}</span>
            </div>
          </div>
        </div>
        
        <div className="trend-card">
          <h4>Monthly Overview</h4>
          <div className="trend-comparison">
            <div className="trend-stat">
              <span className="trend-label">Total Tasks</span>
              <span className="trend-value">{progressStats.month.total}</span>
            </div>
            <div className="trend-stat">
              <span className="trend-label">Productivity Score</span>
              <span className="trend-value">{progressStats.month.productivityScore}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleExportJSON = useCallback(() => {
    const progressData = exportProgressData(tasks);
    const jsonContent = JSON.stringify(progressData, null, 2);
    downloadFile(jsonContent, `progress-report-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  }, [tasks]);

  const handleExportCSV = useCallback(() => {
    const csvContent = exportToCSV(tasks);
    downloadFile(csvContent, `tasks-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }, [tasks]);

  const handleExportReport = useCallback(() => {
    const report = generateProgressReport(tasks);
    downloadFile(report, `progress-report-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
  }, [tasks]);

  const handleShareProgress = useCallback(async () => {
    try {
      await shareProgressData(tasks);
    } catch (error) {
      console.error('Failed to share progress:', error);
    }
  }, [tasks]);

  const handleExportImage = useCallback(() => {
    const progressData = exportProgressData(tasks);
    const imageDataUrl = generateProgressImage(progressData);
    
    // Convert data URL to blob and download
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `progress-chart-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [tasks]);

  const renderGoals = () => (
    <div className="goals-view">
      <h3>🎯 Goals & Milestones</h3>
      <div className="goals-grid">
        <div className="goal-card">
          <div className="goal-icon">🏆</div>
          <div className="goal-content">
            <h4>Daily Goal</h4>
            <p>Complete 5 tasks per day</p>
            <div className="goal-progress">
              <div className="goal-bar">
                <div 
                  className="goal-fill"
                  style={{ width: `${Math.min((progressStats.today.completed / 5) * 100, 100)}%` }}
                ></div>
              </div>
              <span>{progressStats.today.completed}/5</span>
            </div>
          </div>
        </div>
        
        <div className="goal-card">
          <div className="goal-icon">📅</div>
          <div className="goal-content">
            <h4>Weekly Goal</h4>
            <p>Maintain 80% completion rate</p>
            <div className="goal-progress">
              <div className="goal-bar">
                <div 
                  className="goal-fill"
                  style={{ width: `${Math.min((progressStats.week.completionRate / 80) * 100, 100)}%` }}
                ></div>
              </div>
              <span>{progressStats.week.completionRate}/80%</span>
            </div>
          </div>
        </div>
        
        <div className="goal-card">
          <div className="goal-icon">🔥</div>
          <div className="goal-content">
            <h4>Streak Goal</h4>
            <p>Maintain 7-day streak</p>
            <div className="goal-progress">
              <div className="goal-bar">
                <div 
                  className="goal-fill"
                  style={{ width: `${Math.min((streakInfo.current / 7) * 100, 100)}%` }}
                ></div>
              </div>
              <span>{streakInfo.current}/7 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export and Share Actions */}
      <div className="export-actions">
        <h4>📤 Export & Share</h4>
        <div className="export-buttons">
          <button className="export-btn json" onClick={handleExportJSON}>
            📄 Export JSON
          </button>
          <button className="export-btn csv" onClick={handleExportCSV}>
            📊 Export CSV
          </button>
          <button className="export-btn report" onClick={handleExportReport}>
            📝 Export Report
          </button>
          <button className="export-btn image" onClick={handleExportImage}>
            🖼️ Export Image
          </button>
          <button className="export-btn share" onClick={handleShareProgress}>
            🔗 Share Progress
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="progress-tracker-overlay">
      <div className="progress-tracker">
        <div className="progress-header">
          <h2>📊 Progress Tracker</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="progress-controls">
          <div className="time-range-selector">
            <button 
              className={timeRange === 'day' ? 'active' : ''}
              onClick={() => setTimeRange('day')}
            >
              Today
            </button>
            <button 
              className={timeRange === 'week' ? 'active' : ''}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button 
              className={timeRange === 'month' ? 'active' : ''}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
            <button 
              className={timeRange === 'year' ? 'active' : ''}
              onClick={() => setTimeRange('year')}
            >
              This Year
            </button>
          </div>

          <div className="view-mode-selector">
            <button 
              className={viewMode === 'overview' ? 'active' : ''}
              onClick={() => setViewMode('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={viewMode === 'categories' ? 'active' : ''}
              onClick={() => setViewMode('categories')}
            >
              📂 Categories
            </button>
            <button 
              className={viewMode === 'trends' ? 'active' : ''}
              onClick={() => setViewMode('trends')}
            >
              📈 Trends
            </button>
            <button 
              className={viewMode === 'goals' ? 'active' : ''}
              onClick={() => setViewMode('goals')}
            >
              🎯 Goals
            </button>
          </div>
        </div>

        <div className="progress-content">
          {viewMode === 'overview' && renderOverview()}
          {viewMode === 'categories' && renderCategories()}
          {viewMode === 'trends' && renderTrends()}
          {viewMode === 'goals' && renderGoals()}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
