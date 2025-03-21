'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createOnboardingAction,
  updateOnboardingAction,
  getStatusAction,
  getAssessmentLessonsAction,
  completeAssessmentLessonAction,
  getOnboardingAction,
  completeOnboardingAction,
} from '@/lib/server-actions/onboarding-actions';
import logger from '@/utils/logger';
import { AssessmentLesson, OnboardingModel } from '@/models/AppAllModels.model';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useLesson } from './lesson-context';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  checkOnboardingStatus: () => Promise<boolean>;
  markStepComplete: (step: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  getOnboarding: () => Promise<OnboardingModel | null>;
  getAssessmentLessons: () => Promise<AssessmentLesson[]>;
  completeAssessmentLesson: (
    lessonId: string,
    userResponse: string
  ) => Promise<AssessmentLesson>;
  completeOnboardingWithLessons: () => Promise<void>;
  onboarding: OnboardingModel | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingModel | null>(null);
  const router = useRouter();

  // Helper method to handle async operations with loading and error states
  const withLoadingAndErrorHandling = async <T,>(
    operation: () => Promise<T>
  ): Promise<T> => {
    setLoading(true);
    try {
      return await operation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An error occurred';
      setError(message);
      logger.error(message);
      toast.error(message);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async () => {
    return withLoadingAndErrorHandling(async () => {
      const status = await getStatusAction();
      setIsOnboardingComplete(status);
      return status;
    });
  };

  const startOnboarding = async () => {
    return withLoadingAndErrorHandling(async () => {
      await createOnboardingAction();
      setIsOnboardingComplete(false);
    });
  };

  const markStepComplete = async (step: string) => {
    return withLoadingAndErrorHandling(async () => {
      await updateOnboardingAction(step);
      await checkOnboardingStatus();
    });
  };

  const clearError = () => setError(null);

  const getAssessmentLessons = async () => {
    return withLoadingAndErrorHandling(async () => {
      return await getAssessmentLessonsAction();
    });
  };

  const completeAssessmentLesson = async (
    lessonId: string,
    userResponse: string
  ) => {
    return withLoadingAndErrorHandling(async () => {
      return await completeAssessmentLessonAction(lessonId, userResponse);
    });
  };

  const completeOnboardingWithLessons = async () => {
    return withLoadingAndErrorHandling(async () => {
      const completedOnboarding = await completeOnboardingAction();
      setIsOnboardingComplete(true);
      setOnboarding(completedOnboarding);
      toast.success(
        'Onboarding completed! Generating your personalized lessons...'
      );
    });
  };

  const getOnboarding = async () => {
    return withLoadingAndErrorHandling(async () => {
      const result = await getOnboardingAction();
      setOnboarding(result);
      return result;
    });
  };

  // Check onboarding status on initial load
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        const isComplete = await checkOnboardingStatus();
        if (isComplete) {
          // Redirect to lessons if onboarding is complete
          router.push('/app/lessons');
        } else {
          await startOnboarding();
          router.push('/app/onboarding');
        }
      } catch (error) {
        logger.error('Failed to initialize onboarding:', error);
      }
    };

    initializeOnboarding();
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        checkOnboardingStatus,
        markStepComplete,
        loading,
        error,
        clearError,
        getOnboarding,
        getAssessmentLessons,
        completeAssessmentLesson,
        completeOnboardingWithLessons,
        onboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
