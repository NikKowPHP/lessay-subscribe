'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
import { useRouter, usePathname } from 'next/navigation';
import { AssessmentLesson, AssessmentStep, OnboardingModel } from '@/models/AppAllModels.model';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { useAuth } from './auth-context';
import { useUserProfile } from './user-profile-context';
import { Result } from '@/lib/server-actions/_withErrorHandling';
import { useError } from '@/hooks/useError';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  onboarding: OnboardingModel | null;
  loading: boolean;
  error: string | null;
  initializing: boolean;

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
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const {showError} = useError();
  // --------------------------------------------------------------------------
  // helper: unwrap Result<T>, manage loading + errors + toasts
  // --------------------------------------------------------------------------
  /**
   * Unwraps Result<T>, sets loading & error toast,
   * but never throws—always returns T|undefined
   */
  const callAction = async <T,>(
    action: () => Promise<Result<T>>
  ): Promise<T | undefined> => {
    setLoading(true);
    let result: T | undefined;
    try {
      const { data, error: msg } = await action();
      if (msg) {
        // surface the error in your UI
        setError(msg);
        toast.  error(msg);
      } else {
        result = data!;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
    return result;
  };

  // --------------------------------------------------------------------------
  // onboarding flows
  // --------------------------------------------------------------------------
  const startOnboarding = async (): Promise<void> => {
    await callAction(() => createOnboardingAction());
    setIsOnboardingComplete(false);
  };

  const checkOnboardingStatus = async (): Promise<boolean> => {
    const status = await callAction(() => getStatusAction());
    const complete = status ?? false;
    setIsOnboardingComplete(complete);
    return complete;
  };

  const markStepComplete = async (
    step: string,
    formData: any
  ): Promise<void> => {
    await callAction(() => updateOnboardingAction(step, formData));
    // re‑check overall status
    const status = await callAction(() => getStatusAction());
    setIsOnboardingComplete(status ?? false);
  };

  const getOnboarding = async (): Promise<OnboardingModel | null> => {
    const data = await callAction(() => getOnboardingAction());
    setOnboarding(data ?? null);
    return data ?? null;
  };

  // assessment lessons
  const getAssessmentLesson = async (): Promise<AssessmentLesson | undefined> =>
    await callAction(() => getAssessmentLessonAction());

  const completeAssessmentLesson = async (
    id: string,
    resp: string
  ): Promise<AssessmentLesson | undefined> =>
    await callAction(() => completeAssessmentLessonAction(id, resp));

  const recordAssessmentStepAttempt = async (
    lessonId: string,
    stepId: string,
    userResponse: string
  ): Promise<AssessmentStep | undefined> =>
    await callAction(() =>
      recordAssessmentStepAttemptAction(lessonId, stepId, userResponse)
    );

  const updateOnboardingLesson = async (
    lessonId: string,
    data: Partial<AssessmentLesson>
  ): Promise<AssessmentLesson | undefined> =>
    await callAction(() =>
      updateOnboardingLessonAction(lessonId, data)
    );

  const processAssessmentLessonRecording = async (
    recording: RecordingBlob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
  ): Promise<AssessmentLesson | undefined> =>
    await callAction(() =>
      processAssessmentLessonRecordingAction(
        recording,
        lesson,
        recordingTime,
        recordingSize
      )
    );

  const markOnboardingAsCompleteAndGenerateLessons = async (): Promise<void> => {
    const completed = await callAction(() =>
      markOnboardingCompleteAndGenerateInitialLessonsAction()
    );
    if (completed) {
      setOnboarding(completed);
      toast.success('Onboarding completed! Lessons generated!');
    }
  };

  const goToLessonsWithOnboardingComplete = (): void => {
    setIsOnboardingComplete(true);
    router.replace('/app/lessons');
  };

  const clearError = () => setError(null);

  // --------------------------------------------------------------------------
  // initial redirect logic (auth → onboarding vs lessons)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // 1) still waiting on auth/profile?
    if (authLoading || profileLoading) return;

    // 2) if no user, force to login
    if (!user) {
      setInitializing(false);
      if (pathname !== '/app/login') router.replace('/app/login');
      return;
    }

    // 3) allow any /app/profile* routes — do not redirect away
    if (pathname.startsWith('/app/profile')) {
      setInitializing(false);
      return;
    }

    // 4) now decide onboarding vs. lessons
    (async () => {
      try {
        const complete = await callAction(() => getStatusAction());
        setIsOnboardingComplete(complete ?? false);
        if (complete && !pathname.startsWith('/app/lessons')) {
          router.replace('/app/lessons');
        } else if (!complete && pathname !== '/app/onboarding') {
          await callAction(() => createOnboardingAction());
          router.replace('/app/onboarding');
        }
      } catch {
        // already in state.error
      } finally {
        setInitializing(false);
      }
    })();
  }, [authLoading, profileLoading, user, pathname, router]);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        onboarding,
        loading,
        error,
        initializing,
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