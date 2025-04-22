// --- NEW FILE START ---
// File: src/context/app-initializer-context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './auth-context';
import { useUserProfile } from './user-profile-context';
import { useOnboarding } from './onboarding-context';
import { useRouter, usePathname } from 'next/navigation';
import logger from '@/utils/logger';
import AppLoadingIndicator from '@/components/AppLoadingIndicator'; // Assuming this component exists

type InitializationStatus = 'initializing' | 'idle' | 'error';

interface AppInitializerContextType {
  status: InitializationStatus;
  error: string | null;
}

const AppInitializerContext = createContext<AppInitializerContextType | undefined>(
  undefined
);

export function AppInitializerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<InitializationStatus>('initializing');
  const [error, setError] = useState<string | null>(null);

  // --- Initialization Sequence (Placeholder for now) ---
  useEffect(() => {
    logger.info('AppInitializer: Starting initialization sequence...');
    // Simulate initialization delay for testing the loading indicator
    const timer = setTimeout(() => {
      logger.info('AppInitializer: Initialization sequence complete (simulated). Setting status to idle.');
      setStatus('idle'); // Set to idle after a delay
    }, 1500); // Simulate 1.5 seconds initialization

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []); // Run only once on mount

  // --- Redirection Logic (Placeholder for now) ---
  // This will be filled in later steps

  return (
    <AppInitializerContext.Provider value={{ status, error }}>
      {status === 'initializing' && <AppLoadingIndicator />}
      {status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-100 p-4">
          <div className="text-center text-red-800">
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p>Failed to initialize the application.</p>
            <p className="mt-2 text-sm">{error}</p>
            {/* Optionally add a retry button */}
          </div>
        </div>
      )}
      {/* Render children only when idle or if handling errors differently */}
      {status === 'idle' || status === 'error' ? children : null}
    </AppInitializerContext.Provider>
  );
}

export const useAppInitializer = () => {
  const context = useContext(AppInitializerContext);
  if (context === undefined) {
    throw new Error('useAppInitializer must be used within an AppInitializerProvider');
  }
  return context;
};
// --- NEW FILE END ---
