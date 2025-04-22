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
    isOnboardingComplete,
    loading: onboardingLoading,
    error: onboardingError,
  } = useOnboarding();

  const router = useRouter();
  const pathname = usePathname();

  // --- Initialization Sequence ---
  useEffect(() => {
    logger.info('AppInitializer: Starting initialization sequence...');
    setStatus('initializing');
    setError(null);

    if (authLoading) {
      logger.info('AppInitializer: Waiting for auth...');
      return;
    }
    logger.info('AppInitializer: Auth settled.', { user: !!user });

    if (!user) {
      logger.info('AppInitializer: No user found. Setting status to idle.');
      setStatus('idle');
      return;
    }

    if (profileLoading) {
      logger.info('AppInitializer: Waiting for profile...');
      return;
    }
    logger.info('AppInitializer: Profile settled.', { profile: !!profile, profileError });

    if (profileError) {
      logger.error('AppInitializer: Profile error encountered.', { profileError });
      setError(`Profile Error: ${profileError}`);
      setStatus('error');
      return;
    }

    if (!profile) {
      logger.error('AppInitializer: Profile is null after loading without error.');
      setError('Failed to load or create user profile.');
      setStatus('error');
      return;
    }
    logger.info('AppInitializer: Profile loaded successfully.');

    if (onboardingLoading) {
      logger.info('AppInitializer: Waiting for onboarding status...');
      return;
    }
    logger.info('AppInitializer: Onboarding settled.', { isOnboardingComplete, onboardingError });

    if (onboardingError) {
      logger.error('AppInitializer: Onboarding error encountered.', { onboardingError });
      logger.warn('AppInitializer: Proceeding despite onboarding error.');
    }

    logger.info('AppInitializer: Initialization sequence complete. Setting status to idle.');
    setStatus('idle');

  }, [authLoading, user, profileLoading, profile, profileError, onboardingLoading, onboardingError, isOnboardingComplete]);


  // --- Redirection Logic ---
  useEffect(() => {
    logger.info('AppInitializer: Running redirection check...', { status, user: !!user, isOnboardingComplete, pathname });

    // Only redirect when initialization is complete and not in error state
    if (status !== 'idle') {
      logger.info('AppInitializer: Skipping redirect, status is not idle.');
      return;
    }

    const isAuthPage = pathname === '/app/login';
    const isOnboardingPage = pathname === '/app/onboarding';
    // Define other non-redirect pages if needed (e.g., profile page)
    const isProfilePage = pathname.startsWith('/app/profile');

    // Redirect to login if no user and not already on login page
    if (!user && !isAuthPage) {
      logger.info('AppInitializer: No user, redirecting to login.');
      router.replace('/app/login');
    }
    // Redirect to onboarding if user exists, onboarding incomplete, and not on onboarding/profile page
    else if (user && !isOnboardingComplete && !isOnboardingPage && !isProfilePage) {
      logger.info('AppInitializer: User needs onboarding, redirecting to onboarding.');
      router.replace('/app/onboarding');
    }
    // Redirect to lessons if user exists, onboarding complete, but currently on login or onboarding page
    else if (user && isOnboardingComplete && (isAuthPage || isOnboardingPage)) {
      logger.info('AppInitializer: User onboarded, redirecting from auth/onboarding to lessons.');
      router.replace('/app/lessons'); // Default app page after login/onboarding
    }
    // No redirect needed in other cases (e.g., user logged in, onboarding complete, on lessons page)
    else {
      logger.info('AppInitializer: No redirect needed.');
    }

  }, [status, user, isOnboardingComplete, pathname, router]); // Dependencies for redirection


  return (
    <AppInitializerContext.Provider value={{ status, error }}>
      {status === 'initializing' && <AppLoadingIndicator />}
      {status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-100 p-4">
          <div className="text-center text-red-800">
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p>Failed to initialize the application.</p>
            <p className="mt-2 text-sm">{error}</p>
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
