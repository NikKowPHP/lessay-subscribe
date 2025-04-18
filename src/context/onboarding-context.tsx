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
  getAssessmentLesson: () => Promise<AssessmentLesson>;
  completeAssessmentLesson: (
    lessonId: string,
    userResponse: string
  ) => Promise<AssessmentLesson>;
  markOnboardingAsCompleteAndGenerateLessons: () => Promise<void>;
  recordAssessmentStepAttempt: (
    lessonId: string,
    stepId: string,
    userResponse: string
  ) => Promise<AssessmentStep>;
  updateOnboardingLesson: (
    lessonId: string,
    lessonData: Partial<AssessmentLesson>
  ) => Promise<AssessmentLesson>;
  processAssessmentLessonRecording: (
    recording: RecordingBlob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
  ) => Promise<AssessmentLesson>;
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

  // --------------------------------------------------------------------------
  // helper: unwrap Result<T>, manage loading + errors + toasts
  // --------------------------------------------------------------------------
  const callAction = async <T,>(action: () => Promise<Result<T>>): Promise<T> => {
    setLoading(true);
    try {
      const { data, error: msg } = await action();
      if (msg) {
        setError(msg);
        toast.error(msg);
        throw new Error(msg);
      }
      return data!;
    } finally {
      setLoading(false);
    }
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
    setIsOnboardingComplete(status);
    return status;
  };

  const markStepComplete = async (step: string, formData: any): Promise<void> => {
    await callAction(() => updateOnboardingAction(step, formData));
    // re‑check overall status
    const status = await callAction(() => getStatusAction());
    setIsOnboardingComplete(status);
  };

  const getOnboarding = async (): Promise<OnboardingModel | null> => {
    const data = await callAction(() => getOnboardingAction());
    setOnboarding(data);
    return data;
  };

  // assessment lessons
  const getAssessmentLesson = () => callAction(() => getAssessmentLessonAction());
  const completeAssessmentLesson = (id: string, resp: string) =>
    callAction(() => completeAssessmentLessonAction(id, resp));
  const recordAssessmentStepAttempt = (l: string, s: string, r: string) =>
    callAction(() => recordAssessmentStepAttemptAction(l, s, r));
  const updateOnboardingLesson = (id: string, d: Partial<AssessmentLesson>) =>
    callAction(() => updateOnboardingLessonAction(id, d));
  const processAssessmentLessonRecording = (
    rec: RecordingBlob,
    lesson: AssessmentLesson,
    t: number,
    sz: number
  ) => callAction(() => processAssessmentLessonRecordingAction(rec, lesson, t, sz));

  const markOnboardingAsCompleteAndGenerateLessons = async (): Promise<void> => {
    const completed = await callAction(() =>
      markOnboardingCompleteAndGenerateInitialLessonsAction()
    );
    setOnboarding(completed);
    toast.success('Onboarding completed! Lessons generated!');
  };

  const goToLessonsWithOnboardingComplete = () => {
    setIsOnboardingComplete(true);
    router.push('/app/lessons');
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
        setIsOnboardingComplete(complete);
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