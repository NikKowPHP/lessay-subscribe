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
  const {
    isOnboardingComplete, // Get state for redirection logic later
    loading: onboardingLoading,
    error: onboardingError,
    // No need to call actions directly, OnboardingProvider handles it
  } = useOnboarding();

  const router = useRouter(); // Keep for redirection logic
  const pathname = usePathname(); // Keep for redirection logic

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
    if (!profile) {
      logger.error('AppInitializer: Profile is null after loading without error. This indicates a problem.');
      setError('Failed to load or create user profile.');
      setStatus('error');
      return;
    }
    logger.info('AppInitializer: Profile loaded successfully.');

    // If profile exists, wait for onboarding status check
    if (onboardingLoading) {
      logger.info('AppInitializer: Waiting for onboarding status...');
      return;
    }
    logger.info('AppInitializer: Onboarding settled.', { isOnboardingComplete, onboardingError });

    // Handle onboarding error (log but don't block for now)
    if (onboardingError) {
      logger.error('AppInitializer: Onboarding error encountered.', { onboardingError });
      // setError(`Onboarding Error: ${onboardingError}`); // Optionally set error state
      // setStatus('error'); // Optionally set error state
      logger.warn('AppInitializer: Proceeding despite onboarding error.');
    }

    // If onboarding status check is done (regardless of error for now), set to idle
    logger.info('AppInitializer: Initialization sequence complete. Setting status to idle.');
    setStatus('idle');

  }, [authLoading, user, profileLoading, profile, profileError, onboardingLoading, onboardingError, isOnboardingComplete]); // Added onboarding dependencies


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
