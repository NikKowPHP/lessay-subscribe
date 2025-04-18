'use client';

import { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import {
  getLessonsAction,
  getLessonByIdAction,
  createLessonAction,
  updateLessonAction,
  completeLessonAction,
  deleteLessonAction,
  recordStepAttemptAction,
  getStepHistoryAction,
  generateNewLessonsAction,
  processLessonRecordingAction,
  checkAndGenerateNewLessonsAction,
} from '@/lib/server-actions/lesson-actions';
import logger from '@/utils/logger';
import {
  LessonModel,
  LessonStep,
  AssessmentStep as AssessmentStepModel,
} from '@/models/AppAllModels.model';
import toast from 'react-hot-toast';
import { useUpload } from '@/hooks/use-upload';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { useAuth } from '@/context/auth-context';
import { Result } from '@/lib/server-actions/_withErrorHandling';
import { usePathname } from 'next/navigation';
import { useOnboarding } from './onboarding-context';
import { useError } from '@/hooks/useError';

interface LessonContextType {
  currentLesson: LessonModel | null;
  lessons: LessonModel[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  clearError: () => void;
  getLessons: () => Promise<LessonModel[] | undefined>;
  getLessonById: (lessonId: string) => Promise<LessonModel | null>;
  createLesson: (lessonData: {
    focusArea: string;
    targetSkills: string[];
    steps: LessonStep[];
  }) => Promise<LessonModel>;
  updateLesson: (
    lessonId: string,
    lessonData: Partial<LessonModel>
  ) => Promise<LessonModel>;
  completeLesson: (
    lessonId: string,
    sessionRecording: Blob | null
  ) => Promise<LessonModel>;
  deleteLesson: (lessonId: string) => Promise<void>;
  recordStepAttempt: (
    lessonId: string,
    stepId: string,
    userResponse: string
    // correct: boolean
    // errorPatterns?: string[]
  ) => Promise<LessonStep | AssessmentStepModel>;
  getStepHistory: (lessonId: string, stepId: string) => Promise<LessonStep[]>;
  setCurrentLesson: (lesson: LessonModel | null) => void;
  checkAndGenerateNewLessons: () => Promise<void>;
  processLessonRecording: (
    sessionRecording: Blob,
    lesson: LessonModel,
    recordingTime: number,
    recordingSize: number
  ) => Promise<LessonModel>;
  refreshLessons: () => Promise<LessonModel[]>;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const { uploadFile } = useUpload();
  const { user } = useAuth();
  const { isOnboardingComplete, onboarding } = useOnboarding();
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const prevIsOnboardingComplete = useRef<boolean>(isOnboardingComplete); 
  const { showError } = useError();
  const callAction = useCallback(async <T,>(action: () => Promise<Result<T>>): Promise<T> => {
    setLoading(true);
    try {
      const { data, error } = await action();
      if (error) {
        setError(error);
        showError(error);
        throw new Error(error);
      }
      return data! as T;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   *  fetch lessons and store them
   */
  const refreshLessons = useCallback(async (): Promise<LessonModel[]> => {
    logger.info('LessonContext: Refreshing lessons...');
    // No user, no lessons
    if (!user) {
        logger.warn('LessonContext: Skipping refresh, no user.');
        setLessons([]); // Clear lessons if user logs out
        setInitialized(false); // Reset initialized state on logout
        return [];
    }
    try {
      // *** Add Guard ***
  if (!onboarding?.initialAssessmentCompleted) {
    logger.warn("Skipping lesson fetch: Initial assessment not completed.");
    setLessons([]); // Clear existing lessons if any
    return [];
  }
  // *** End Guard ***
      const data = await callAction(() => getLessonsAction());
      setLessons(data);
      logger.info(`LessonContext: Refreshed lessons, count: ${data.length}`);
      return data;
    } catch (refreshError) {
      logger.error('LessonContext: Failed to refresh lessons', refreshError);
      // Error is already handled by callAction (state set, toast shown)
      setLessons([]); // Clear lessons on error? Or keep stale data? Clearing might be safer.
      return []; // Return empty array on failure
    }
  }, [callAction, user, onboarding?.initialAssessmentCompleted]);

  // 1) Fetch one by ID
  const getLessonById = async (id: string): Promise<LessonModel| null> => {
    const lesson = await callAction(() => getLessonByIdAction(id));
    setCurrentLesson(lesson);
    return lesson;
  };

  // 3) Create
  const createLesson = async (ld: {
    focusArea: string;
    targetSkills: string[];
    steps: LessonStep[];
  }): Promise<LessonModel> => {
    const lesson = await callAction(() => createLessonAction(ld));
    setLessons((prev) => [lesson, ...prev]);
    setCurrentLesson(lesson);
    return lesson;
  };

  // 4) Update
  const updateLesson = async (
    lessonId: string,
    lessonData: Partial<LessonModel>
  ): Promise<LessonModel> => {
    const lesson = await callAction(() => updateLessonAction(lessonId, lessonData));
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? lesson : l))
    );
    if (currentLesson?.id === lessonId) setCurrentLesson(lesson);
    return lesson;
  };

  // 5) Complete
  const completeLesson = async (
    lessonId: string,
    sessionRecording: Blob | null
  ): Promise<LessonModel> => {
    const lesson = await callAction(() => completeLessonAction(lessonId));
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? lesson : l))
    );
    if (currentLesson?.id === lessonId) setCurrentLesson(lesson);
    return lesson;
  };

  // 6) Delete
  const deleteLesson = async (lessonId: string): Promise<void> => {
    await callAction(() => deleteLessonAction(lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    if (currentLesson?.id === lessonId) setCurrentLesson(null);
  };

  // 7) Record a step
  const recordStepAttempt = async (
    lessonId: string,
    stepId: string,
    userResponse: string
  ): Promise<LessonStep | AssessmentStepModel> => {
    const step = await callAction(() => recordStepAttemptAction(
      lessonId,
      stepId,
      userResponse
    ));
    setCurrentLesson((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.stepNumber === step.stepNumber ? { ...s, ...step } : s
        ),
      };
    });
    return step;
  };

  // 8) Step history
  const getStepHistory = async (
    lessonId: string,
    stepId: string
  ): Promise<LessonStep[]> => {
    const history = await callAction(() => getStepHistoryAction(
      lessonId,
      stepId
    ));
    return history;
  };

  // 9) Generate new based on progress
  const checkAndGenerateNewLessons = async (): Promise<void> => {
    await callAction(() => checkAndGenerateNewLessonsAction());
    setLessons((prev) => [...prev]);
    toast.success('New lessons generated based on your progress!');
  };

  // 10) Process audio recordings
  const processLessonRecording = async (
    sessionRecording: RecordingBlob,
    lesson: LessonModel,
    recordingTime: number,
    recordingSize: number
  ): Promise<LessonModel> => {
    const processedLesson = await callAction(() => processLessonRecordingAction(
      sessionRecording,
      recordingTime,
      recordingSize,
      lesson
    ));
    return processedLesson;
  };

  const pathname = usePathname();

  //
  // 1) Initial fetch when `user` first becomes available
  //
  useEffect(() => {
    if (!user) return;

    refreshLessons()
      .then(() => setInitialized(true))
      .catch(() => {
        /* error already handled in callAction */
      });
  }, [user, refreshLessons]);

  //
  // 2) Subsequent fetch any time we navigate into `/app/lessons`
  //
  useEffect(() => {
    const justCompletedOnboarding =
      prevIsOnboardingComplete.current === false && isOnboardingComplete === true;

    // Update the ref *after* comparison for the next render
    prevIsOnboardingComplete.current = isOnboardingComplete;

    // Fetch lessons if:
    // 1. We have a user AND
    // 2. EITHER this is the first time loading after user logged in (!initialized)
    //    OR onboarding was *just* completed in this render cycle.
    if (user && (!initialized || justCompletedOnboarding)) {
      logger.info('LessonProvider: Triggering refreshLessons', {
        userId: user.id,
        initialized,
        justCompletedOnboarding,
      });
      refreshLessons()
        .then((fetchedLessons) => {
          // Only set initialized to true after the *first* successful fetch for this user session
          if (!initialized && fetchedLessons.length >= 0) { // Check >= 0 to handle case where 0 lessons is valid
            setInitialized(true);
            logger.info('LessonProvider: Initialized.');
          }
        })
        .catch(() => {
          /* error handled in refreshLessons/callAction */
          // Do not set initialized on error
        });
    } else {
      logger.debug('LessonProvider: Skipping refreshLessons', {
        userId: user?.id,
        initialized,
        justCompletedOnboarding,
        isOnboardingComplete, // Log current onboarding state
      });
    }

    // Reset initialized state if user logs out
    if (!user && initialized) {
        logger.info('LessonProvider: User logged out, resetting initialized state.');
        setInitialized(false);
        setLessons([]); // Clear lessons immediately on logout
    }

  }, [user, isOnboardingComplete, initialized, refreshLessons]); 
  const clearError = () => setError(null);

  return (
    <LessonContext.Provider
      value={{
        currentLesson,
        lessons,
        loading,
        error,
        initialized,
        clearError,
        getLessons: refreshLessons,
        getLessonById,
        createLesson,
        updateLesson,
        completeLesson,
        deleteLesson,
        recordStepAttempt,
        getStepHistory,
        setCurrentLesson,
        checkAndGenerateNewLessons,
        processLessonRecording,
        refreshLessons,
      }}
    >
      {children}
    </LessonContext.Provider>
  );
}

export const useLesson = () => {
  const context = useContext(LessonContext);
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
};
