import React, { useState } from 'react';
import { exportToJSON, exportToCSV, exportToMarkdown } from '../utils/progressExport';

const TaskExporter = ({ tasks, onClose }) => {
  const [exportFormat, setExportFormat] = useState('json');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        tasks,
        exportDate: new Date().toISOString(),
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length
      };

      switch (exportFormat) {
        case 'json':
          await exportToJSON(data, 'taskflow-export');
          break;
        case 'csv':
          await exportToCSV(data, 'taskflow-export');
          break;
        case 'markdown':
          await exportToMarkdown(data, 'taskflow-export');
          break;
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="task-exporter">
      <h3>Export Tasks</h3>
      <div className="export-options">
        <label>
          <input
            type="radio"
            value="json"
            checked={exportFormat === 'json'}
            onChange={(e) => setExportFormat(e.target.value)}
          />
          JSON Format
        </label>
        <label>
          <input
            type="radio"
            value="csv"
            checked={exportFormat === 'csv'}
            onChange={(e) => setExportFormat(e.target.value)}
          />
          CSV Format
        </label>
        <label>
          <input
            type="radio"
            value="markdown"
            checked={exportFormat === 'markdown'}
            onChange={(e) => setExportFormat(e.target.value)}
          />
          Markdown Report
        </label>
      </div>
      <div className="export-actions">
        <button onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default TaskExporter;
