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
// Import AppInitializer context
import { useAppInitializer } from './app-initializer-context';

interface LessonContextType {
  currentLesson: LessonModel | null;
  lessons: LessonModel[];
  loading: boolean;
  error: string | null;
  initialized: boolean; // Tracks if lessons have been fetched *at least once* successfully for the current session/conditions
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
  const { status: appInitializerStatus } = useAppInitializer(); // Get initializer status
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, only true during actual fetch
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false); // Tracks if lessons have been fetched *at least once* successfully
  const { showError } = useError();
  const pathname = usePathname();

  const callAction = useCallback(async <T,>(action: () => Promise<Result<T>>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await action();
      if (error) {
        setError(error);
        showError(error);
        throw new Error(error);
      }
      if (data === undefined) {
        throw new Error('Action returned successfully but with undefined data.');
      }
      return data;
    } catch (err) {
      if (!(err instanceof Error && error === err.message)) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        showError(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError, error]); // Added `error` dependency

  const refreshLessons = useCallback(async (): Promise<LessonModel[]> => {
    logger.info('LessonContext: Attempting to refresh lessons...');

    // --- Pre-conditions for fetching ---
    if (appInitializerStatus !== 'idle') {
      logger.warn('LessonContext: Skipping refresh, app not initialized.');
      return lessons; // Return current (likely empty) lessons
    }
    if (!user) {
      logger.warn('LessonContext: Skipping refresh, no user.');
      setLessons([]);
      setInitialized(false);
      return [];
    }
    if (!isOnboardingComplete) {
      logger.warn('LessonContext: Skipping refresh, onboarding not complete.');
      setLessons([]);
      setInitialized(false);
      return [];
    }
    // Only fetch if on the lessons page
    if (pathname !== '/app/lessons') {
      logger.info('LessonContext: Skipping refresh, not on lessons page.', { pathname });
      // Don't clear lessons if navigating away, keep existing state
      return lessons;
    }
    // --- End Pre-conditions ---

    logger.info('LessonContext: Conditions met, proceeding with lesson fetch.');
    try {
      const data = await callAction(() => getLessonsAction());
      setLessons(data);
      setInitialized(true); // Mark as initialized *after* successful fetch
      logger.info(`LessonContext: Refreshed lessons, count: ${data.length}. Initialized: true.`);
      return data;
    } catch (refreshError) {
      logger.error('LessonContext: Failed to refresh lessons', refreshError);
      setLessons([]); // Clear lessons on error
      setInitialized(false); // Reset initialized on error? Maybe keep true if previously successful? Let's reset for now.
      return [];
    }
  }, [callAction, user, appInitializerStatus, isOnboardingComplete, pathname, lessons]); // Added dependencies

  // Effect to trigger initial fetch/refresh based on conditions
  useEffect(() => {
    logger.debug('LessonProvider: Initial fetch effect triggered.', { appInitializerStatus, user: !!user, isOnboardingComplete, pathname, initialized });

    // Conditions to trigger the fetch:
    // 1. App Initializer must be idle.
    // 2. User must be logged in.
    // 3. Onboarding must be complete.
    // 4. Must be on the lessons page.
    // 5. Lessons haven't been successfully initialized yet OR onboarding was just completed (handled implicitly by isOnboardingComplete change).
    if (
      appInitializerStatus === 'idle' &&
      user &&
      isOnboardingComplete &&
      pathname === '/app/lessons' &&
      !initialized // Only run if not yet initialized under these conditions
    ) {
      logger.info('LessonProvider: Conditions met for initial lesson fetch/refresh.');
      refreshLessons(); // Call refreshLessons which now contains all checks
    } else {
      logger.debug('LessonProvider: Conditions not met for initial fetch/refresh.');
    }

    // Reset state if user logs out or app initializer status changes from idle
    if (!user || (appInitializerStatus !== 'idle' && appInitializerStatus !== 'initializing')) {
      if (initialized || lessons.length > 0) {
        logger.info('LessonProvider: Resetting lessons state due to user logout or app status change.');
        setLessons([]);
        setCurrentLesson(null);
        setInitialized(false);
        setError(null);
      }
    }

  }, [appInitializerStatus, user, isOnboardingComplete, pathname, initialized, refreshLessons]);


  // --- Other context methods (remain largely unchanged) ---

  const getLessonById = async (id: string): Promise<LessonModel | null> => {
    // Consider adding checks here if needed, though typically called when lesson list is already populated
    const lesson = await callAction(() => getLessonByIdAction(id));
    setCurrentLesson(lesson);
    return lesson;
  };

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

  const completeLesson = async (
    lessonId: string,
    sessionRecording: Blob | null // Keep signature, even if not used directly here
  ): Promise<LessonModel> => {
    // completeLessonAction likely triggers the analysis including recording if needed
    const lesson = await callAction(() => completeLessonAction(lessonId));
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? lesson : l))
    );
    if (currentLesson?.id === lessonId) setCurrentLesson(lesson);
    // Potentially trigger checkAndGenerateNewLessons after completion?
    // checkAndGenerateNewLessons(); // Or handle this elsewhere
    return lesson;
  };

  const deleteLesson = async (lessonId: string): Promise<void> => {
    await callAction(() => deleteLessonAction(lessonId));
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    if (currentLesson?.id === lessonId) setCurrentLesson(null);
  };

  const recordStepAttempt = async (
    lessonId: string,
    stepId: string,
    userResponse: string
  ): Promise<LessonStep | AssessmentStepModel> => {
    // No global loading for step attempts
    const { data: step, error: stepError } = await recordStepAttemptAction(
      lessonId,
      stepId,
      userResponse
    );
    if (stepError) {
      setError(stepError);
      showError(stepError);
      throw new Error(stepError);
    }
    if (!step) {
      throw new Error('Step attempt action returned no data.');
    }
    // Update local currentLesson state optimistically or based on response
    setCurrentLesson((prev) => {
      if (!prev || prev.id !== lessonId) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId ? { ...s, ...step } : s // Use ID for matching
        ),
      };
    });
    return step;
  };

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

  const checkAndGenerateNewLessons = async (): Promise<void> => {
    // This action might implicitly call getLessons, ensure conditions are met
    const newLessons = await callAction(() => checkAndGenerateNewLessonsAction());
    if (newLessons && newLessons.length > 0) {
      // Refresh the list to include the new lessons
      await refreshLessons();
      toast.success('New lessons generated based on your progress!');
    } else {
      logger.info("checkAndGenerateNewLessonsAction completed but returned no new lessons.");
      // Optionally inform the user if needed, or just refresh silently
      await refreshLessons(); // Refresh even if no new lessons generated to ensure consistency
    }
  };

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
    // Update local state after processing
    setLessons((prev) =>
      prev.map((l) => (l.id === processedLesson.id ? processedLesson : l))
    );
    if (currentLesson?.id === processedLesson.id) setCurrentLesson(processedLesson);
    return processedLesson;
  };

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
        getLessons: refreshLessons, // Expose refresh directly
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
        refreshLessons, // Keep refreshLessons exposed if needed externally
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
// --- NEW CODE END ---
