'use client';

import { createContext, useCallback, useContext, useState, useEffect } from 'react';
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
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const callAction = useCallback(async <T,>(action: () => Promise<Result<T>>): Promise<T> => {
    setLoading(true);
    try {
      const { data, error } = await action();
      if (error) {
        setError(error);
        toast.error(error);
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
    const data = await callAction(() => getLessonsAction());
    setLessons(data);
    return data;
  }, [callAction]);

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
    // Log current state for debugging dependencies
    logger.debug('LessonProvider Nav Hook Check:', { pathname, initialized, userId: user?.id });

    // Check ALL conditions *before* deciding to fetch
    // We only want to fetch if we ARE on the lessons page AND initialization is complete AND we have a user.
    if (pathname.startsWith('/app/lessons') && initialized && user) {
      logger.info('LessonProvider Nav Hook: Conditions met, refreshing lessons...');
      refreshLessons().catch((err) => {
        logger.error('LessonProvider Nav Hook: Error refreshing lessons', err);
        // Error is already handled/toasted by callAction in refreshLessons
      });
    } else {
      // Log *why* it's skipping for clarity
      if (!pathname.startsWith('/app/lessons')) {
        logger.debug('LessonProvider Nav Hook: Skipping fetch (not on lessons page)');
      } else if (!initialized) {
        // This is the likely reason after redirect
        logger.debug('LessonProvider Nav Hook: Skipping fetch (provider not initialized yet)');
      } else if (!user) {
        // This could also be the reason if auth is slow
        logger.debug('LessonProvider Nav Hook: Skipping fetch (no user yet)');
      }
    }

    // Dependencies: This hook should re-run if the path changes,
    // OR if initialization completes (`initialized` becomes true),
    // OR if the user logs in/out (`user` changes).
    // `refreshLessons` is stable due to useCallback.
  }, [pathname, initialized, user, refreshLessons]); // Keep these dependencies
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
