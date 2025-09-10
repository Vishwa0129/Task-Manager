import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from './logger';
import { performanceMonitor } from './enhancedPerformance';

// Advanced debounced state hook
export const useAdvancedDebounce = (value, delay, options = {}) => {
  const {
    leading = false,
    trailing = true,
    maxWait = null,
    equalityFn = Object.is
  } = options;

  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef();
  const maxTimeoutRef = useRef();
  const lastCallTimeRef = useRef();
  const lastInvokeTimeRef = useRef(0);

  useEffect(() => {
    const invokeFunc = () => {
      const time = Date.now();
      lastInvokeTimeRef.current = time;
      setDebouncedValue(value);
    };

    const shouldInvoke = (time) => {
      const timeSinceLastCall = time - (lastCallTimeRef.current || 0);
      const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
      
      return (
        lastCallTimeRef.current === undefined ||
        timeSinceLastCall >= delay ||
        (maxWait !== null && timeSinceLastInvoke >= maxWait)
      );
    };

    const timerExpired = () => {
      const time = Date.now();
      if (shouldInvoke(time)) {
        invokeFunc();
      }
    };

    const leadingEdge = (time) => {
      lastInvokeTimeRef.current = time;
      timeoutRef.current = setTimeout(timerExpired, delay);
      return leading ? invokeFunc() : debouncedValue;
    };

    const remainingWait = (time) => {
      const timeSinceLastCall = time - (lastCallTimeRef.current || 0);
      const timeSinceLastInvoke = time - lastInvokeTimeRef.current;
      const timeWaiting = delay - timeSinceLastCall;
      
      return maxWait !== null
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    };

    const trailingEdge = (time) => {
      timeoutRef.current = undefined;
      if (trailing && lastCallTimeRef.current !== undefined) {
        return invokeFunc();
      }
      lastCallTimeRef.current = undefined;
      return debouncedValue;
    };

    const debounced = () => {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);
      
      lastCallTimeRef.current = time;

      if (isInvoking) {
        if (timeoutRef.current === undefined) {
          return leadingEdge(time);
        }
        if (maxWait !== null) {
          timeoutRef.current = setTimeout(timerExpired, delay);
          return leading ? invokeFunc() : debouncedValue;
        }
      }
      
      if (timeoutRef.current === undefined) {
        timeoutRef.current = setTimeout(timerExpired, delay);
      }
      
      return debouncedValue;
    };

    if (!equalityFn(value, debouncedValue)) {
      debounced();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing, maxWait, equalityFn, debouncedValue]);

  return debouncedValue;
};

// Advanced local storage hook with compression and encryption
export const useAdvancedLocalStorage = (key, initialValue, options = {}) => {
  const {
    compress = false,
    encrypt = false,
    ttl = null,
    syncAcrossTabs = true,
    onError = (error) => logger.error('LocalStorage error', { error })
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      let parsed = JSON.parse(item);
      
      // Check TTL
      if (ttl && parsed.timestamp) {
        const now = Date.now();
        if (now - parsed.timestamp > ttl) {
          window.localStorage.removeItem(key);
          return initialValue;
        }
        parsed = parsed.value;
      }

      // Decompress if needed
      if (compress && parsed.compressed) {
        // Simple compression placeholder - in real app use LZ-string or similar
        parsed = JSON.parse(atob(parsed.data));
      }

      // Decrypt if needed
      if (encrypt && parsed.encrypted) {
        // Encryption placeholder - in real app use crypto-js or similar
        parsed = JSON.parse(atob(parsed.data));
      }

      return parsed;
    } catch (error) {
      onError(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      
      let dataToStore = value;

      // Compress if needed
      if (compress) {
        const compressed = btoa(JSON.stringify(value));
        dataToStore = { compressed: true, data: compressed };
      }

      // Encrypt if needed
      if (encrypt) {
        const encrypted = btoa(JSON.stringify(dataToStore));
        dataToStore = { encrypted: true, data: encrypted };
      }

      // Add TTL if specified
      if (ttl) {
        dataToStore = {
          value: dataToStore,
          timestamp: Date.now()
        };
      }

      window.localStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (error) {
      onError(error);
    }
  }, [key, compress, encrypt, ttl, onError]);

  // Sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          onError(error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, syncAcrossTabs, onError]);

  return [storedValue, setValue];
};

// Advanced async hook with retry and caching
export const useAdvancedAsync = (asyncFunction, dependencies = [], options = {}) => {
  const {
    retries = 3,
    retryDelay = 1000,
    cache = true,
    cacheKey = null,
    timeout = 10000,
    onSuccess = () => {},
    onError = (error) => logger.error('Async operation failed', { error })
  } = options;

  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    retryCount: 0
  });

  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef();

  const execute = useCallback(async (...args) => {
    const key = cacheKey || JSON.stringify([asyncFunction.toString(), ...args]);
    
    // Check cache first
    if (cache && cacheRef.current.has(key)) {
      const cachedResult = cacheRef.current.get(key);
      setState(prev => ({ ...prev, data: cachedResult, loading: false, error: null }));
      return cachedResult;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    let retryCount = 0;
    
    const attemptExecution = async () => {
      try {
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Add timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        });

        const result = await Promise.race([
          asyncFunction(...args, { signal }),
          timeoutPromise
        ]);

        // Cache result
        if (cache) {
          cacheRef.current.set(key, result);
        }

        setState(prev => ({ 
          ...prev, 
          data: result, 
          loading: false, 
          error: null,
          retryCount: 0
        }));

        onSuccess(result);
        return result;
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        retryCount++;
        
        if (retryCount <= retries) {
          setState(prev => ({ ...prev, retryCount }));
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return attemptExecution();
        }

        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error, 
          retryCount 
        }));
        
        onError(error);
        throw error;
      }
    };

    return attemptExecution();
  }, [asyncFunction, retries, retryDelay, cache, cacheKey, timeout, onSuccess, onError]);

  useEffect(() => {
    execute();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    ...state,
    execute,
    retry,
    clearCache
  };
};

// Advanced intersection observer hook
export const useAdvancedIntersection = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = false,
    onIntersect = () => {},
    onLeave = () => {}
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const elementRef = useRef();
  const observerRef = useRef();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry.isIntersecting;
        
        setIsIntersecting(isCurrentlyIntersecting);
        setEntry(entry);

        if (isCurrentlyIntersecting) {
          onIntersect(entry);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else {
          onLeave(entry);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, onIntersect, onLeave]);

  return {
    ref: elementRef,
    isIntersecting,
    entry
  };
};

// Advanced media query hook
export const useAdvancedMediaQuery = (queries) => {
  const [matches, setMatches] = useState({});

  useEffect(() => {
    const mediaQueries = Object.entries(queries).map(([key, query]) => ({
      key,
      mq: window.matchMedia(query)
    }));

    const updateMatches = () => {
      const newMatches = {};
      mediaQueries.forEach(({ key, mq }) => {
        newMatches[key] = mq.matches;
      });
      setMatches(newMatches);
    };

    // Initial check
    updateMatches();

    // Add listeners
    mediaQueries.forEach(({ mq }) => {
      mq.addEventListener('change', updateMatches);
    });

    return () => {
      mediaQueries.forEach(({ mq }) => {
        mq.removeEventListener('change', updateMatches);
      });
    };
  }, [queries]);

  return matches;
};

// Advanced performance hook
export const useAdvancedPerformance = (componentName) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    renderTime: 0,
    mountTime: 0,
    updateTime: 0
  });

  const renderStartTime = useRef();
  const mountStartTime = useRef();
  const renderCountRef = useRef(0);

  useEffect(() => {
    mountStartTime.current = performance.now();
    
    return () => {
      const mountTime = performance.now() - mountStartTime.current;
      logger.debug(`${componentName} unmounted`, { 
        mountTime: `${mountTime.toFixed(2)}ms`,
        totalRenders: renderCountRef.current
      });
    };
  }, [componentName]);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCountRef.current++;
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      const isMount = renderCountRef.current === 1;
      
      setMetrics(prev => ({
        ...prev,
        renderCount: renderCountRef.current,
        renderTime,
        [isMount ? 'mountTime' : 'updateTime']: renderTime
      }));

      if (renderTime > 16) {
        logger.warn(`Slow ${isMount ? 'mount' : 'update'} in ${componentName}`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCountRef.current
        });
      }
    }
  });

  return metrics;
};

// Advanced form hook with validation
export const useAdvancedForm = (initialValues = {}, validationSchema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((fieldName, value) => {
    const validator = validationSchema[fieldName];
    if (!validator) return null;

    try {
      if (typeof validator === 'function') {
        return validator(value, values);
      }
      
      if (validator.required && (!value || value.toString().trim() === '')) {
        return validator.message || `${fieldName} is required`;
      }

      if (validator.minLength && value.length < validator.minLength) {
        return validator.message || `${fieldName} must be at least ${validator.minLength} characters`;
      }

      if (validator.maxLength && value.length > validator.maxLength) {
        return validator.message || `${fieldName} must be no more than ${validator.maxLength} characters`;
      }

      if (validator.pattern && !validator.pattern.test(value)) {
        return validator.message || `${fieldName} format is invalid`;
      }

      return null;
    } catch (error) {
      logger.error('Validation error', { error, fieldName, value });
      return 'Validation error occurred';
    }
  }, [validationSchema, values]);

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate on change if field was touched
    if (touched[name]) {
      const error = validate(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validate, touched]);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (isTouched) {
      const error = validate(name, values[name]);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validate, values]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationSchema).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}));

    return isValid;
  }, [validationSchema, validate, values]);

  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      if (e) e.preventDefault();
      
      setIsSubmitting(true);
      
      try {
        const isValid = validateAll();
        if (isValid) {
          await onSubmit(values);
        }
      } catch (error) {
        logger.error('Form submission error', { error });
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validateAll]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const getFieldProps = useCallback((name) => ({
    value: values[name] || '',
    onChange: (e) => setValue(name, e.target.value),
    onBlur: () => setFieldTouched(name),
    error: touched[name] && errors[name],
    name
  }), [values, errors, touched, setValue, setFieldTouched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    validateAll,
    handleSubmit,
    reset,
    getFieldProps,
    isValid: Object.keys(errors).length === 0
  };
};

export default {
  useAdvancedDebounce,
  useAdvancedLocalStorage,
  useAdvancedAsync,
  useAdvancedIntersection,
  useAdvancedMediaQuery,
  useAdvancedPerformance,
  useAdvancedForm
};
