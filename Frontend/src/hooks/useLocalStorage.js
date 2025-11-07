// Custom hook for localStorage - work in progress
// TODO: Add error handling
// FIXME: Should be converted to TypeScript

import { useState, useEffect } from 'react';

// Experimental localStorage hook (incomplete)
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      console.log(`Loading from localStorage: ${key}`, item); // Debug
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      console.log(`Saving to localStorage: ${key}`, valueToStore); // Debug log
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

// Experimental session storage hook (partial implementation)
export const useSessionStorage = (key, initialValue) => {
  // TODO: Implement session storage logic
  console.log('useSessionStorage not implemented yet');
  return [initialValue, () => {}];
};

/*
// Commented out experimental secure storage
export const useSecureStorage = (key, initialValue) => {
  // This would encrypt data before storing
  // TODO: Implement encryption/decryption
  return useLocalStorage(key, initialValue);
};
*/