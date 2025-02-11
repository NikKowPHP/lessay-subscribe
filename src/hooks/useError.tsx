'use client';

import logger from '@/utils/logger';
import React, { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

export interface ErrorMessage {
  message: string;
  type: ErrorType;
  id?: string;
}

interface ErrorContextType {
  showError: (message: string, type?: ErrorType) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const showError = useCallback((message: string, type: ErrorType = 'error') => {
    logger.log("Showing error:", message, type);
    
    switch (type) {
      case 'error':
        toast.error(message, {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
          },
          icon: '❌',
        });
        break;
      case 'warning':
        toast(message, {
          duration: 5000,
          style: {
            background: '#F59E0B',
            color: '#000',
          },
          icon: '⚠️',
        });
        break;
      case 'info':
        toast(message, {
          duration: 5000,
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
          icon: 'ℹ️',
        });
        break;
      case 'success':
        toast.success(message, {
          duration: 5000,
          style: {
            background: '#10B981',
            color: '#fff',
          },
          icon: '✅',
        });
        break;
    }
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          className: '',
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '500px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
          // Custom success styles
          success: {
            style: {
              background: '#10B981',
            },
          },
          // Custom error styles
          error: {
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
