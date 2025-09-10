// Advanced validation system with comprehensive error handling
import PropTypes from 'prop-types';

// Task validation schemas
export const TaskSchema = {
  id: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  completed: PropTypes.bool.isRequired,
  createdAt: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  category: PropTypes.oneOf(['general', 'work', 'personal', 'health', 'finance', 'education', 'shopping', 'other']).isRequired,
  priority: PropTypes.oneOf(['low', 'medium', 'high']).isRequired,
  dueDate: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  description: PropTypes.string,
  estimatedTime: PropTypes.number,
  actualTime: PropTypes.number,
  order: PropTypes.number,
  completedAt: PropTypes.string,
  subtasks: PropTypes.arrayOf(PropTypes.object),
  attachments: PropTypes.arrayOf(PropTypes.object)
};

// Advanced validation functions
export class ValidationEngine {
  static validateTask(task, strict = false) {
    const errors = [];
    const warnings = [];

    // Required field validation
    if (!task.text || typeof task.text !== 'string' || task.text.trim().length === 0) {
      errors.push('Task text is required and must be a non-empty string');
    }

    if (task.text && task.text.length > 500) {
      errors.push('Task text must be less than 500 characters');
    }

    if (typeof task.completed !== 'boolean') {
      errors.push('Task completed status must be a boolean');
    }

    // Category validation
    const validCategories = ['general', 'work', 'personal', 'health', 'finance', 'education', 'shopping', 'other'];
    if (task.category && !validCategories.includes(task.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Priority validation
    const validPriorities = ['low', 'medium', 'high'];
    if (task.priority && !validPriorities.includes(task.priority)) {
      errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Date validation
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) {
        errors.push('Due date must be a valid date string');
      } else if (dueDate < new Date() && !task.completed) {
        warnings.push('Due date is in the past');
      }
    }

    if (task.createdAt) {
      const createdDate = new Date(task.createdAt);
      if (isNaN(createdDate.getTime())) {
        errors.push('Created date must be a valid date string');
      }
    }

    // Time validation
    if (task.estimatedTime !== undefined && task.estimatedTime !== null) {
      if (typeof task.estimatedTime !== 'number' || task.estimatedTime < 0) {
        errors.push('Estimated time must be a positive number');
      }
    }

    if (task.actualTime !== undefined && task.actualTime !== null) {
      if (typeof task.actualTime !== 'number' || task.actualTime < 0) {
        errors.push('Actual time must be a positive number');
      }
    }

    // Tags validation
    if (task.tags) {
      if (!Array.isArray(task.tags)) {
        errors.push('Tags must be an array');
      } else {
        task.tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            errors.push(`Tag at index ${index} must be a string`);
          }
          if (tag.length > 50) {
            errors.push(`Tag at index ${index} must be less than 50 characters`);
          }
        });
      }
    }

    // Description validation
    if (task.description && typeof task.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (task.description && task.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    // Strict mode validations
    if (strict) {
      if (!task.id) {
        errors.push('Task ID is required in strict mode');
      }
      
      if (!task.createdAt) {
        errors.push('Created date is required in strict mode');
      }
      
      if (!task.updatedAt) {
        errors.push('Updated date is required in strict mode');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
    };
  }

  static validateTaskList(tasks) {
    if (!Array.isArray(tasks)) {
      return {
        isValid: false,
        errors: ['Tasks must be an array'],
        warnings: [],
        taskValidations: []
      };
    }

    const taskValidations = tasks.map((task, index) => ({
      index,
      ...this.validateTask(task, true)
    }));

    const allErrors = taskValidations.flatMap(v => v.errors.map(e => `Task ${v.index}: ${e}`));
    const allWarnings = taskValidations.flatMap(v => v.warnings.map(w => `Task ${v.index}: ${w}`));

    // Check for duplicate IDs
    const ids = tasks.map(t => t.id).filter(Boolean);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      allErrors.push(`Duplicate task IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      taskValidations,
      summary: {
        total: tasks.length,
        valid: taskValidations.filter(v => v.isValid).length,
        invalid: taskValidations.filter(v => !v.isValid).length,
        warnings: taskValidations.filter(v => v.warnings.length > 0).length
      }
    };
  }

  static sanitizeTask(task) {
    const sanitized = { ...task };

    // Sanitize text fields
    if (sanitized.text) {
      sanitized.text = sanitized.text.trim().substring(0, 500);
    }

    if (sanitized.description) {
      sanitized.description = sanitized.description.trim().substring(0, 2000);
    }

    // Ensure required fields have defaults
    sanitized.completed = Boolean(sanitized.completed);
    sanitized.category = sanitized.category || 'general';
    sanitized.priority = sanitized.priority || 'medium';
    sanitized.tags = Array.isArray(sanitized.tags) ? sanitized.tags : [];
    sanitized.createdAt = sanitized.createdAt || new Date().toISOString();
    sanitized.updatedAt = new Date().toISOString();

    // Sanitize tags
    sanitized.tags = sanitized.tags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.trim().substring(0, 50))
      .filter(tag => tag.length > 0);

    // Ensure numeric fields are valid
    if (sanitized.estimatedTime !== undefined && sanitized.estimatedTime !== null) {
      sanitized.estimatedTime = Math.max(0, Number(sanitized.estimatedTime) || 0);
    }

    if (sanitized.actualTime !== undefined && sanitized.actualTime !== null) {
      sanitized.actualTime = Math.max(0, Number(sanitized.actualTime) || 0);
    }

    return sanitized;
  }

  static validateProgressData(progressData) {
    const errors = [];
    const warnings = [];

    if (!progressData || typeof progressData !== 'object') {
      errors.push('Progress data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate export metadata
    if (!progressData.exportDate) {
      warnings.push('Export date is missing');
    } else {
      const exportDate = new Date(progressData.exportDate);
      if (isNaN(exportDate.getTime())) {
        errors.push('Export date must be a valid date');
      }
    }

    if (!progressData.exportVersion) {
      warnings.push('Export version is missing');
    }

    // Validate summary data
    if (progressData.summary) {
      const { summary } = progressData;
      
      if (typeof summary.totalTasks !== 'number' || summary.totalTasks < 0) {
        errors.push('Total tasks must be a non-negative number');
      }
      
      if (typeof summary.completedTasks !== 'number' || summary.completedTasks < 0) {
        errors.push('Completed tasks must be a non-negative number');
      }
      
      if (summary.completedTasks > summary.totalTasks) {
        errors.push('Completed tasks cannot exceed total tasks');
      }
      
      if (typeof summary.completionRate !== 'number' || summary.completionRate < 0 || summary.completionRate > 100) {
        errors.push('Completion rate must be between 0 and 100');
      }
    }

    // Validate tasks array
    if (progressData.tasks) {
      const taskValidation = this.validateTaskList(progressData.tasks);
      if (!taskValidation.isValid) {
        errors.push(...taskValidation.errors);
      }
      warnings.push(...taskValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
    };
  }
}

// Custom validation hooks
export const useValidation = () => {
  const validateAndSanitize = (task) => {
    const validation = ValidationEngine.validateTask(task);
    const sanitized = ValidationEngine.sanitizeTask(task);
    
    return {
      ...validation,
      sanitized,
      canProceed: validation.errors.length === 0
    };
  };

  const validateBulkOperation = (tasks, operation) => {
    const validation = ValidationEngine.validateTaskList(tasks);
    
    // Additional operation-specific validations
    if (operation === 'export' && tasks.length === 0) {
      validation.warnings.push('Exporting empty task list');
    }
    
    if (operation === 'import' && tasks.length > 1000) {
      validation.warnings.push('Importing large number of tasks may affect performance');
    }
    
    return validation;
  };

  return {
    validateAndSanitize,
    validateBulkOperation,
    ValidationEngine
  };
};

// Error boundary helper
export class TaskValidationError extends Error {
  constructor(message, validation, task = null) {
    super(message);
    this.name = 'TaskValidationError';
    this.validation = validation;
    this.task = task;
  }
}

export default ValidationEngine;
