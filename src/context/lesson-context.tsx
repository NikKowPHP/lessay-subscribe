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
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const { uploadFile } = useUpload();
  const { user } = useAuth();

  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

/** 
 * Wraps any server‐action returning Result<T>,
 * manages loading + errors + toasts,
 * and finally returns T or bubbles as Error.
 */
async function callAction<T>(
  action: () => Promise<Result<T>>
): Promise<T> {
  setLoading(true);
  try {
    const { data, error } = await action();
    if (error) {
      setError(error);
      toast.error(error);
      throw new Error(error);
    }
    return data!;
  } finally {
    setLoading(false);
  }
}

  // 1) Fetch all lessons
  const getLessons = async (): Promise<LessonModel[]> => {
    const lessons = await callAction(() => getLessonsAction());
    setLessons(lessons);
    return lessons;
  };

  // 2) Fetch one by ID
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

  // auto-fetch when user becomes available:
  useEffect(() => {
    if (!user) return;
    getLessons()
      .then(() => setInitialized(true))
      .catch(() => {
        /* swallow here; error already handled in withLoading... */
      });
  }, [user]);

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
        getLessons,
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
