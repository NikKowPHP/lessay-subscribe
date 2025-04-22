'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createOnboardingAction,
  getOnboardingAction,
  updateOnboardingAction,
  deleteOnboardingAction,
  markOnboardingCompleteAndGenerateInitialLessonsAction,
  getStatusAction,
  getAssessmentLessonAction,
  completeAssessmentLessonAction,
  recordAssessmentStepAttemptAction,
  updateOnboardingLessonAction,
  processAssessmentLessonRecordingAction,
} from '@/lib/server-actions/onboarding-actions';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import { useRouter } from 'next/navigation';
import { AssessmentLesson, AssessmentStep, OnboardingModel } from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { useAuth } from './auth-context';
import { Result } from '@/lib/server-actions/_withErrorHandling';
import { useError } from '@/hooks/useError';
// Removed useAppInitializer import

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  onboarding: OnboardingModel | null;
  loading: boolean; // General loading for actions initiated within this context
  error: string | null;
  // Add setters for AppInitializer to update state (if needed, but likely handled internally now)
  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingModel | null>>;
  setIsOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;

  startOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
  markStepComplete: (step: string, formData: any) => Promise<void>;
  getOnboarding: () => Promise<OnboardingModel | null>; // Keep for manual refresh

  getAssessmentLesson: () => Promise<AssessmentLesson | undefined>;
  completeAssessmentLesson: (
    lessonId: string,
    userResponse: string
  ) => Promise<AssessmentLesson | undefined>;
  markOnboardingAsCompleteAndGenerateLessons: () => Promise<void>;

  recordAssessmentStepAttempt: (
    lessonId: string,
    stepId: string,
    userResponse: string
  ) => Promise<AssessmentStep | undefined>;

  updateOnboardingLesson: (
    lessonId: string,
    lessonData: Partial<AssessmentLesson>
  ) => Promise<AssessmentLesson | undefined>;

  processAssessmentLessonRecording: (
    recording: RecordingBlob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
  ) => Promise<AssessmentLesson | undefined>;

  clearError: () => void;
  goToLessonsWithOnboardingComplete: () => void;
}


const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth(); // Only need user from auth

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingModel | null>(null);
  const [loading, setLoading] = useState(false); // Loading for specific actions
  const [error, setError] = useState<string | null>(null);
  const { showError } = useError();

  // Helper to call server actions
  const callAction = useCallback(async <T,>(
    action: () => Promise<Result<T>>,
    setGlobalLoading = true
  ): Promise<T | undefined> => {
    if (setGlobalLoading) setLoading(true);
    setError(null);
    let resultData: T | undefined;
    try {
      const { data, error: msg } = await action();
      if (msg) {
        setError(msg);
        showError(msg);
      } else {
        resultData = data;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showError(message);
    } finally {
      if (setGlobalLoading) setLoading(false);
    }
    return resultData;
  }, [showError]);

  // Effect to fetch onboarding data when user logs in (after initializer ensures it exists)
  useEffect(() => {
    const fetchOnboardingData = async () => {
      if (user && onboarding === null) { // Fetch only if user exists and local state is null
        logger.info("OnboardingProvider: User logged in, fetching onboarding data...");
        setLoading(true); // Indicate loading for this context's fetch
        const data = await callAction(() => getOnboardingAction(), false); // Don't set global loading
        if (data) {
          setOnboarding(data);
          setIsOnboardingComplete(data.completed);
          logger.info("OnboardingProvider: Onboarding data fetched and context updated.", { completed: data.completed });
        } else {
          logger.warn("OnboardingProvider: getOnboardingAction returned null/undefined even though user exists.");
          // This might indicate an issue if the initializer didn't create it properly.
          // Optionally, try creating it here as a fallback?
          // await startOnboarding(); // Be cautious with automatic creation here
        }
        setLoading(false);
      } else if (!user) {
        // Clear local state if user logs out
        setOnboarding(null);
        setIsOnboardingComplete(false);
      }
    };

    fetchOnboardingData();
  }, [user, callAction]); // Depend only on user


  // --- Onboarding Actions (remain largely the same) ---
  const startOnboarding = async (): Promise<void> => {
    const data = await callAction(() => createOnboardingAction());
    if (data) {
      setOnboarding(data);
      setIsOnboardingComplete(false);
    }
  };

  const checkOnboardingStatus = async (): Promise<boolean> => {
    const status = await callAction(() => getStatusAction());
    const complete = status ?? false;
    setIsOnboardingComplete(complete);
    return complete;
  };

  const markStepComplete = async (step: string, formData: any): Promise<void> => {
    const updatedOnboarding = await callAction(() => updateOnboardingAction(step, formData));
    if (updatedOnboarding) {
      setOnboarding(updatedOnboarding);
      setIsOnboardingComplete(updatedOnboarding.completed);
    }
  };

  const getOnboarding = async (): Promise<OnboardingModel | null> => {
    // This can be used for manual refresh
    const data = await callAction(() => getOnboardingAction());
    if (data) {
      setOnboarding(data);
      setIsOnboardingComplete(data.completed);
    }
    return data ?? null;
  };

  const markOnboardingAsCompleteAndGenerateLessons = async (): Promise<void> => {
    const completed = await callAction(() => markOnboardingCompleteAndGenerateInitialLessonsAction());
    if (completed) {
      setOnboarding(completed);
      setIsOnboardingComplete(true);
      toast.success('Onboarding completed! Lessons generated!');
      // Navigation is handled by AppInitializer
    }
  };

  const goToLessonsWithOnboardingComplete = (): void => {
    setIsOnboardingComplete(true);
    router.replace('/app/lessons');
  };

  // --- Assessment Actions (remain the same) ---
  const getAssessmentLesson = async (): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => getAssessmentLessonAction());
  }

  const completeAssessmentLesson = async (id: string, resp: string): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => completeAssessmentLessonAction(id, resp));
  }

  const recordAssessmentStepAttempt = async (lessonId: string, stepId: string, userResponse: string): Promise<AssessmentStep | undefined> => {
    return await callAction(() => recordAssessmentStepAttemptAction(lessonId, stepId, userResponse), false);
  }

  const updateOnboardingLesson = async (lessonId: string, data: Partial<AssessmentLesson>): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => updateOnboardingLessonAction(lessonId, data));
  }

  const processAssessmentLessonRecording = async (recording: RecordingBlob, lesson: AssessmentLesson, recordingTime: number, recordingSize: number): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => processAssessmentLessonRecordingAction(recording, lesson, recordingTime, recordingSize));
  }

  const deleteOnboarding = async (): Promise<void> => {
    await callAction(() => deleteOnboardingAction());
    setOnboarding(null);
    setIsOnboardingComplete(false);
  }

  const clearError = () => setError(null);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        onboarding,
        loading,
        error,
        setOnboarding, // Expose setter
        setIsOnboardingComplete, // Expose setter
        startOnboarding,
        checkOnboardingStatus,
        markStepComplete,
        getOnboarding,
        getAssessmentLesson,
        completeAssessmentLesson,
        recordAssessmentStepAttempt,
        updateOnboardingLesson,
        processAssessmentLessonRecording,
        markOnboardingAsCompleteAndGenerateLessons,
        goToLessonsWithOnboardingComplete,
        clearError,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = (): OnboardingContextType => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
};
// --- NEW CODE END ---
