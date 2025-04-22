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
import { useRouter } from 'next/navigation'; // Use next/navigation
import { AssessmentLesson, AssessmentStep, OnboardingModel } from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { useAuth } from './auth-context';
import { Result } from '@/lib/server-actions/_withErrorHandling';
import { useError } from '@/hooks/useError';
import { useAppInitializer } from './app-initializer-context'; // Import AppInitializer context

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  onboarding: OnboardingModel | null;
  loading: boolean; // General loading for actions
  error: string | null;
  // Add setters for AppInitializer to update state
  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingModel | null>>;
  setIsOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;

  startOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
  markStepComplete: (step: string, formData: any) => Promise<void>;
  getOnboarding: () => Promise<OnboardingModel | null>;

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
  const { user } = useAuth();
  const { status: appInitializerStatus } = useAppInitializer(); // Get initializer status

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingModel | null>(null);
  const [loading, setLoading] = useState(false); // Loading for specific actions, not initial load
  const [error, setError] = useState<string | null>(null);
  const { showError } = useError();

  // Helper to call server actions and handle loading/errors
  const callAction = useCallback(async <T,>(
    action: () => Promise<Result<T>>,
    setGlobalLoading = true // Control if this action sets the global loading state
  ): Promise<T | undefined> => {
    if (setGlobalLoading) setLoading(true);
    setError(null);
    let resultData: T | undefined;
    try {
      const { data, error: msg } = await action();
      if (msg) {
        setError(msg);
        showError(msg); // Use the hook to show toast
      } else {
        resultData = data; // Assign data if no error
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      showError(message); // Use the hook to show toast
    } finally {
      if (setGlobalLoading) setLoading(false);
    }
    return resultData; // Return the data or undefined
  }, [showError]); // Dependency on showError

  // Fetch onboarding data when user changes or initializer finishes, but only if not already loaded
  useEffect(() => {
    const fetchOnboardingIfNeeded = async () => {
      // Only fetch if initializer is idle, user exists, and onboarding state is not yet set
      if (appInitializerStatus === 'idle' && user && onboarding === null) {
        logger.info("OnboardingProvider: Initializer idle and user exists, fetching onboarding data...");
        setLoading(true); // Indicate loading for this specific fetch
        const data = await callAction(() => getOnboardingAction(), false); // Don't set global loading here
        if (data) {
          setOnboarding(data);
          setIsOnboardingComplete(data.completed);
          logger.info("OnboardingProvider: Onboarding data fetched.", { completed: data.completed });
        } else {
          // Handle case where onboarding might be null even after initializer (e.g., creation failed silently)
          logger.warn("OnboardingProvider: getOnboardingAction returned null/undefined after initializer.");
          // Optionally try creating again, or rely on user action
        }
        setLoading(false);
      } else if (!user) {
        // Clear onboarding state if user logs out
        setOnboarding(null);
        setIsOnboardingComplete(false);
      }
    };

    fetchOnboardingIfNeeded();
  }, [user, appInitializerStatus, onboarding, callAction]); // Rerun when user or initializer status changes, or if onboarding is null


  // --- Onboarding Actions ---
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
      // Re-check overall status from the updated data
      setIsOnboardingComplete(updatedOnboarding.completed);
    }
  };

  const getOnboarding = async (): Promise<OnboardingModel | null> => {
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
      setIsOnboardingComplete(true); // Explicitly set complete
      toast.success('Onboarding completed! Lessons generated!');
      // Navigation is handled by AppInitializer's redirection logic now
    }
  };

  const goToLessonsWithOnboardingComplete = (): void => {
    // This function might still be useful for manual navigation triggers
    setIsOnboardingComplete(true);
    router.replace('/app/lessons');
  };

  // --- Assessment Actions ---
  const getAssessmentLesson = async (): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => getAssessmentLessonAction());
  }

  const completeAssessmentLesson = async (id: string, resp: string): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => completeAssessmentLessonAction(id, resp));
  }

  const recordAssessmentStepAttempt = async (lessonId: string, stepId: string, userResponse: string): Promise<AssessmentStep | undefined> => {
    // Use setGlobalLoading = false for step attempts
    return await callAction(() => recordAssessmentStepAttemptAction(lessonId, stepId, userResponse), false);
  }

  const updateOnboardingLesson = async (lessonId: string, data: Partial<AssessmentLesson>): Promise<AssessmentLesson | undefined> => {
    return await callAction(() => updateOnboardingLessonAction(lessonId, data));
  }

  const processAssessmentLessonRecording = async (recording: RecordingBlob, lesson: AssessmentLesson, recordingTime: number, recordingSize: number): Promise<AssessmentLesson | undefined> => {
    // This might be a longer operation, keep setGlobalLoading = true (default)
    return await callAction(() => processAssessmentLessonRecordingAction(recording, lesson, recordingTime, recordingSize));
  }

  const deleteOnboarding = async (): Promise<void> => {
    await callAction(() => deleteOnboardingAction());
    setOnboarding(null);
    setIsOnboardingComplete(false);
  }

  const clearError = () => setError(null);

  // Remove the initial redirect logic useEffect, as it's now handled by AppInitializerProvider

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
