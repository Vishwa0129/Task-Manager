import React, { useState, useCallback } from 'react';
import { ValidationEngine } from '../utils/advancedValidation';

const TaskImporter = ({ onImport, onClose }) => {
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState('json');
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportData(e.target.result);
    };
    reader.readAsText(file);
  }, []);

  const validateImportData = useCallback(() => {
    try {
      let parsedData;
      
      if (importFormat === 'json') {
        parsedData = JSON.parse(importData);
      } else {
        // Simple CSV parsing for tasks
        const lines = importData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        parsedData = {
          tasks: lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const task = {};
            headers.forEach((header, index) => {
              task[header] = values[index] || '';
            });
            return task;
          })
        };
      }

      const validation = ValidationEngine.validateTaskList(parsedData.tasks || []);
      setValidationResult(validation);
      return validation;
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [`Invalid ${importFormat.toUpperCase()} format: ${error.message}`],
        warnings: []
      });
      return null;
    }
  }, [importData, importFormat]);

  const handleImport = async () => {
    const validation = validateImportData();
    if (!validation || !validation.isValid) return;

    setIsImporting(true);
    try {
      const parsedData = JSON.parse(importData);
      await onImport(parsedData.tasks || []);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="task-importer">
      <h3>Import Tasks</h3>
      
      <div className="import-format">
        <label>
          <input
            type="radio"
            value="json"
            checked={importFormat === 'json'}
            onChange={(e) => setImportFormat(e.target.value)}
          />
          JSON Format
        </label>
        <label>
          <input
            type="radio"
            value="csv"
            checked={importFormat === 'csv'}
            onChange={(e) => setImportFormat(e.target.value)}
          />
          CSV Format
        </label>
      </div>

      <div className="import-input">
        <input
          type="file"
          accept={importFormat === 'json' ? '.json' : '.csv'}
          onChange={handleFileUpload}
        />
        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
          rows={10}
        />
      </div>

      {importData && (
        <button onClick={validateImportData}>
          Validate Data
        </button>
      )}

      {validationResult && (
        <div className={`validation-result ${validationResult.isValid ? 'valid' : 'invalid'}`}>
          {validationResult.isValid ? (
            <p>✅ Data is valid! Ready to import {validationResult.summary?.total || 0} tasks.</p>
          ) : (
            <div>
              <p>❌ Validation failed:</p>
              <ul>
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="import-actions">
        <button 
          onClick={handleImport} 
          disabled={isImporting || !validationResult?.isValid}
        >
          {isImporting ? 'Importing...' : 'Import Tasks'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default TaskImporter;
