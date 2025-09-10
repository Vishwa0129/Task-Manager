import React, { useMemo } from 'react';
import { TaskAnalytics } from '../utils/taskUtils';

const AnalyticsDashboard = ({ tasks, onClose }) => {
  const analytics = useMemo(() => {
    const taskAnalytics = new TaskAnalytics(tasks);
    return {
      productivityScore: taskAnalytics.calculateProductivityScore(tasks),
      categoryBreakdown: taskAnalytics.getCategoryBreakdown(),
      priorityBreakdown: taskAnalytics.getPriorityBreakdown(),
      completionTrends: taskAnalytics.getCompletionTrends(),
      streak: taskAnalytics.calculateStreak(tasks)
    };
  }, [tasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>📊 Analytics Dashboard</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>📈 Productivity Score</h3>
          <div className="score-display">
            <span className="score-value">{analytics.productivityScore}</span>
            <span className="score-label">/100</span>
          </div>
        </div>

        <div className="analytics-card">
          <h3>🎯 Completion Rate</h3>
          <div className="completion-display">
            <div className="completion-bar">
              <div 
                className="completion-fill" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="completion-text">{completionRate}%</span>
          </div>
        </div>

        <div className="analytics-card">
          <h3>🔥 Current Streak</h3>
          <div className="streak-display">
            <span className="streak-value">{analytics.streak.current}</span>
            <span className="streak-label">days</span>
          </div>
        </div>

        <div className="analytics-card">
          <h3>📋 Category Breakdown</h3>
          <div className="category-list">
            {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <span className="category-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>⚡ Priority Distribution</h3>
          <div className="priority-list">
            {Object.entries(analytics.priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="priority-item">
                <span className={`priority-badge priority-${priority}`}>
                  {priority}
                </span>
                <span className="priority-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card full-width">
          <h3>📊 Completion Trends</h3>
          <div className="trends-chart">
            {analytics.completionTrends.map((trend, index) => (
              <div key={index} className="trend-bar">
                <div className="trend-label">{trend.date}</div>
                <div className="trend-progress">
                  <div 
                    className="trend-fill" 
                    style={{ height: `${trend.percentage}%` }}
                  ></div>
                </div>
                <div className="trend-value">{trend.completed}/{trend.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
