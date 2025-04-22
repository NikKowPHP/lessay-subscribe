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
import { useOnboarding } from './onboarding-context'; // Keep for later steps
import { useRouter, usePathname } from 'next/navigation';
import logger from '@/utils/logger';
import AppLoadingIndicator from '@/components/AppLoadingIndicator';

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

  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  // Keep onboarding context hooks for later integration
  const { loading: onboardingLoading, error: onboardingError } = useOnboarding();

  // --- Initialization Sequence ---
  useEffect(() => {
    logger.info('AppInitializer: Starting initialization sequence...');
    setStatus('initializing');
    setError(null);

    // Wait for auth to settle
    if (authLoading) {
      logger.info('AppInitializer: Waiting for auth...');
      return;
    }
    logger.info('AppInitializer: Auth settled.', { user: !!user });

    // If no user, initialization is done (redirect handled elsewhere or later)
    if (!user) {
      logger.info('AppInitializer: No user found. Setting status to idle.');
      setStatus('idle');
      return;
    }

    // If user exists, wait for profile
    if (profileLoading) {
      logger.info('AppInitializer: Waiting for profile...');
      return;
    }
    logger.info('AppInitializer: Profile settled.', { profile: !!profile, profileError });

    // Handle profile error
    if (profileError) {
      logger.error('AppInitializer: Profile error encountered.', { profileError });
      setError(`Profile Error: ${profileError}`);
      setStatus('error');
      return;
    }

    // If profile doesn't exist after loading (and no error), something is wrong
    // UserProfileProvider should handle creation, but if it fails silently, catch it here.
    if (!profile) {
      logger.error('AppInitializer: Profile is null after loading without error. This indicates a problem.');
      setError('Failed to load or create user profile.');
      setStatus('error');
      return;
    }

    // --- Placeholder for Onboarding Check (Next Step) ---
    // For now, if profile is loaded successfully, move to idle
    logger.info('AppInitializer: Profile loaded successfully. Setting status to idle (pending onboarding check).');
    setStatus('idle');
    // --- End Placeholder ---


  }, [authLoading, user, profileLoading, profile, profileError]); // Dependencies for sequence


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
// --- NEW CODE END ---
