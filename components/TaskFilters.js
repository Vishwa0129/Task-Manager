import React, { useState, useCallback } from 'react';
import { TASK_CATEGORIES, PRIORITY_LEVELS } from '../utils/taskUtils';
import { debounce } from '../utils/performance';

const TaskFilters = ({ 
  filters, 
  onFiltersChange, 
  taskStats,
  onExport,
  onImport 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query) => {
      onFiltersChange({ ...filters, search: query });
    }, 300),
    [filters, onFiltersChange]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    onFiltersChange({
      search: '',
      status: 'all',
      category: 'all',
      priority: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.priority !== 'all') count++;
    return count;
  };

  return (
    <div className="task-filters">
      <div className="filters-header">
        <h3>📊 Filters & Search</h3>
        <div className="filter-actions">
          <button
            className="toggle-advanced-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '🔼' : '🔽'} Advanced
          </button>
          {getActiveFilterCount() > 0 && (
            <button
              className="clear-filters-btn"
              onClick={clearAllFilters}
            >
              🗑️ Clear ({getActiveFilterCount()})
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="🔍 Search tasks, categories, descriptions..."
            value={searchInput}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchInput && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchInput('');
                onFiltersChange({ ...filters, search: '' });
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Basic Filters */}
      <div className="basic-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tasks ({taskStats.total})</option>
            <option value="pending">Pending ({taskStats.pending})</option>
            <option value="completed">Completed ({taskStats.completed})</option>
            <option value="overdue">Overdue ({taskStats.overdue})</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {Object.entries(TASK_CATEGORIES).map(([key, category]) => (
              <option key={key} value={key}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Priority:</label>
          <select
            value={filters.priority || 'all'}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
              <option key={key} value={key}>
                {priority.icon} {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Sort By:</label>
              <select
                value={filters.sortBy || 'createdAt'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="createdAt">Date Created</option>
                <option value="updatedAt">Last Updated</option>
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="text">Alphabetical</option>
                <option value="category">Category</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Order:</label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="filter-select"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Due Date:</label>
              <select
                value={filters.dueDateFilter || 'all'}
                onChange={(e) => handleFilterChange('dueDateFilter', e.target.value)}
                className="filter-select"
              >
                <option value="all">Any Time</option>
                <option value="today">Due Today</option>
                <option value="tomorrow">Due Tomorrow</option>
                <option value="thisWeek">This Week</option>
                <option value="nextWeek">Next Week</option>
                <option value="noDueDate">No Due Date</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Time Estimate:</label>
              <select
                value={filters.timeFilter || 'all'}
                onChange={(e) => handleFilterChange('timeFilter', e.target.value)}
                className="filter-select"
              >
                <option value="all">Any Duration</option>
                <option value="quick">Quick (≤15 min)</option>
                <option value="short">Short (16-30 min)</option>
                <option value="medium">Medium (31-60 min)</option>
                <option value="long">Long (>60 min)</option>
                <option value="noEstimate">No Estimate</option>
              </select>
            </div>
          </div>

          {/* Import/Export Section */}
          <div className="import-export-section">
            <h4>📁 Data Management</h4>
            <div className="data-actions">
              <button
                className="export-btn"
                onClick={() => onExport('json')}
              >
                📤 Export JSON
              </button>
              <button
                className="export-btn"
                onClick={() => onExport('csv')}
              >
                📊 Export CSV
              </button>
              <label className="import-btn">
                📥 Import
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      onImport(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="filter-summary">
          <span className="summary-text">
            Active filters: {getActiveFilterCount()}
          </span>
          <div className="active-filters">
            {filters.search && (
              <span className="active-filter">
                Search: "{filters.search}"
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="active-filter">
                Status: {filters.status}
              </span>
            )}
            {filters.category !== 'all' && (
              <span className="active-filter">
                Category: {TASK_CATEGORIES[filters.category]?.label}
              </span>
            )}
            {filters.priority !== 'all' && (
              <span className="active-filter">
                Priority: {PRIORITY_LEVELS[filters.priority]?.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
