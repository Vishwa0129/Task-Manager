import React, { useState, useRef, useEffect } from 'react';
import { TASK_CATEGORIES, PRIORITY_LEVELS, TASK_TEMPLATES } from '../utils/taskUtils';
import { logger } from '../utils/logger';

const SmartTaskInput = ({ onAddTask, isLoading }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef(null);

  // Smart suggestions based on input
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = input.toLowerCase();
    const matchedTemplates = TASK_TEMPLATES.filter(template =>
      template.text.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query)
    );

    setSuggestions(matchedTemplates.slice(0, 5));
    setShowSuggestions(matchedTemplates.length > 0);
    setSelectedSuggestion(-1);
  }, [input]);

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          selectSuggestion(suggestions[selectedSuggestion]);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;
    }
  };

  const selectSuggestion = (template) => {
    setInput(template.text);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    
    // Auto-submit with template data
    onAddTask({
      text: template.text,
      category: template.category,
      priority: template.priority,
      estimatedTime: template.estimatedTime,
      description: template.description
    });
    
    setInput('');
    logger.userAction('template-selected', { template: template.text });
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;

    onAddTask({ text: input.trim() });
    setInput('');
    setShowSuggestions(false);
  };

  return (
    <div className="smart-task-input">
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done? (Start typing for suggestions...)"
          className="smart-input"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="submit-btn"
        >
          {isLoading ? '⏳' : '➕'}
        </button>
      </div>

      {showSuggestions && (
        <div className="suggestions-dropdown">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
              onClick={() => selectSuggestion(suggestion)}
            >
              <div className="suggestion-text">{suggestion.text}</div>
              <div className="suggestion-meta">
                <span className={`category-badge ${suggestion.category}`}>
                  {TASK_CATEGORIES[suggestion.category]?.icon} {TASK_CATEGORIES[suggestion.category]?.label}
                </span>
                <span className={`priority-badge ${suggestion.priority}`}>
                  {PRIORITY_LEVELS[suggestion.priority]?.icon} {PRIORITY_LEVELS[suggestion.priority]?.label}
                </span>
                {suggestion.estimatedTime && (
                  <span className="time-badge">⏱️ {suggestion.estimatedTime}min</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartTaskInput;
