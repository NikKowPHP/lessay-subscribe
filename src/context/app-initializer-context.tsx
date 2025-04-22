'use client'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './auth-context';
import { useUserProfile } from './user-profile-context';
import { useOnboarding } from './onboarding-context'; // Import useOnboarding for redirection logic
import { useRouter, usePathname } from 'next/navigation';
import logger from '@/utils/logger';
import AppLoadingIndicator from '@/components/AppLoadingIndicator';
import {
  getOnboardingAction,
  createOnboardingAction,
} from '@/lib/server-actions/onboarding-actions'; // Import onboarding actions

type InitializationStatus = 'initializing' | 'idle' | 'error';

interface AppInitializerContextType {
  status: InitializationStatus;
  error: string | null;
  // No need to pass initial onboarding state down if redirection uses live state
}

const AppInitializerContext = createContext<AppInitializerContextType | undefined>(
  undefined
);

export function AppInitializerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<InitializationStatus>('initializing');
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  // Get live onboarding state for redirection logic
  const { isOnboardingComplete } = useOnboarding();

  const router = useRouter();
  const pathname = usePathname();

  // --- Initialization Sequence ---
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      if (!isMounted) return;

      logger.info('AppInitializer: Starting initialization sequence...');
      setStatus('initializing');
      setError(null);

      // 1. Wait for Auth
      if (authLoading) {
        logger.info('AppInitializer: Waiting for auth...');
        return;
      }
      logger.info('AppInitializer: Auth settled.', { user: !!user });

      // 2. Handle No User
      if (!user) {
        logger.info('AppInitializer: No user found. Setting status to idle.');
        if (isMounted) setStatus('idle');
        return;
      }

      // 3. Wait for Profile
      if (profileLoading) {
        logger.info('AppInitializer: Waiting for profile...');
        return;
      }
      logger.info('AppInitializer: Profile settled.', { profile: !!profile, profileError });

      // 4. Handle Profile Error
      if (profileError) {
        logger.error('AppInitializer: Profile error encountered.', { profileError });
        if (isMounted) {
          setError(`Profile Error: ${profileError}`);
          setStatus('error');
        }
        return;
      }

      // 5. Handle Missing Profile
      if (!profile) {
        logger.error('AppInitializer: Profile is null after loading without error.');
        if (isMounted) {
          setError('Failed to load or create user profile.');
          setStatus('error');
        }
        return;
      }
      logger.info('AppInitializer: Profile loaded successfully.');

      // 6. Check/Create Onboarding (Crucial step before idle)
      logger.info('AppInitializer: Checking/Creating Onboarding...');
      try {
        const { data: onboardingData, error: getError } = await getOnboardingAction();

        if (getError && !getError.includes('Not found')) {
          logger.error('AppInitializer: Error fetching onboarding.', { getError });
          throw new Error(`Failed to fetch onboarding status: ${getError}`);
        }

        let initialCompleteStatus = false; // Default to incomplete

        if (onboardingData) {
          initialCompleteStatus = onboardingData.completed;
          logger.info('AppInitializer: Onboarding found.', { completed: initialCompleteStatus });
        } else {
          logger.info('AppInitializer: Onboarding not found, creating...');
          const { data: createdOnboarding, error: createError } = await createOnboardingAction();
          if (createError) {
            logger.error('AppInitializer: Error creating onboarding.', { createError });
            throw new Error(`Failed to create onboarding profile: ${createError}`);
          }
          if (!createdOnboarding) {
            logger.error('AppInitializer: createOnboardingAction returned no data and no error.');
            throw new Error('Failed to create onboarding profile.');
          }
          initialCompleteStatus = createdOnboarding.completed; // Should be false
          logger.info('AppInitializer: Onboarding created successfully.');
          // Note: We don't need to update OnboardingContext here; it will fetch its own data based on the user.
        }

        logger.info('AppInitializer: Onboarding check/create complete.');

        // 7. Set final status to idle *after* onboarding check/create
        if (isMounted) setStatus('idle');
        logger.info('AppInitializer: Initialization sequence complete. Status set to idle.');

      } catch (err: any) {
        logger.error('AppInitializer: Onboarding check/create failed.', err);
        if (isMounted) {
          setError(err.message || 'Failed during onboarding check.');
          setStatus('error');
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      logger.info('AppInitializer: Unmounting initialization effect.');
    };
  }, [authLoading, user, profileLoading, profile, profileError]); // Removed onboarding context dependencies


  // --- Redirection Logic ---
  useEffect(() => {
    logger.info('AppInitializer: Running redirection check...', { status, user: !!user, isOnboardingComplete, pathname });

    // Only run redirection logic when initialization is complete and successful
    if (status !== 'idle') {
      logger.info('AppInitializer: Skipping redirect, status is not idle.');
      return;
    }

    const isLoginPage = pathname === '/app/login';
    const isOnboardingPage = pathname === '/app/onboarding';
    const isLessonsPage = pathname.startsWith('/app/lessons'); // Check if it's the lessons page or a sub-page
    const isProfilePage = pathname.startsWith('/app/profile');

    // 1. Handle unauthenticated users
    if (!user) {
      if (!isLoginPage) {
        logger.info('AppInitializer: No user, redirecting to login.');
        router.replace('/app/login');
      } else {
        logger.info('AppInitializer: No user, already on login page.');
      }
      return; // Stop further checks if no user
    }

    // --- User is authenticated from here ---

    // 2. Allow access to profile pages regardless of onboarding status
    if (isProfilePage) {
      logger.info('AppInitializer: Allowing access to profile page.');
      return;
    }

    // 3. Handle users needing onboarding
    if (!isOnboardingComplete) {
      if (!isOnboardingPage) {
        logger.info('AppInitializer: User needs onboarding, redirecting to onboarding.');
        router.replace('/app/onboarding');
      } else {
        logger.info('AppInitializer: User needs onboarding, already on onboarding page.');
      }
      return; // Stop further checks
    }

    // --- User is authenticated AND onboarding is complete ---

    // 4. Redirect to lessons if not already there (or on profile)
    if (!isLessonsPage) {
      // This covers cases like being on /app, /app/login, /app/onboarding after completion
      logger.info('AppInitializer: User onboarded, redirecting to lessons.');
      router.replace('/app/lessons');
    } else {
      logger.info('AppInitializer: User onboarded, already on lessons page.');
    }

  }, [status, user, isOnboardingComplete, pathname, router]);

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
      {(status === 'idle' || status === 'error') && children}
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
