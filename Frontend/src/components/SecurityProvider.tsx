import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { generateCSRFToken, getSecureHeaders } from '../utils/security';

interface SecurityContextType {
  csrfToken: string;
  secureHeaders: { [key: string]: string };
  refreshCSRFToken: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [csrfToken, setCSRFToken] = useState<string>('');
  const [secureHeaders, setSecureHeaders] = useState<{ [key: string]: string }>({});

  const refreshCSRFToken = () => {
    const newToken = generateCSRFToken();
    setCSRFToken(newToken);
    setSecureHeaders(getSecureHeaders(newToken));
  };

  useEffect(() => {
    refreshCSRFToken();
    
    // Refresh CSRF token every 30 minutes
    const interval = setInterval(refreshCSRFToken, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const value: SecurityContextType = {
    csrfToken,
    secureHeaders,
    refreshCSRFToken
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};