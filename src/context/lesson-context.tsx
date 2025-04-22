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
  generateInitialLessonsAction, // Import the new action
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
import { useAppInitializer } from './app-initializer-context';

interface LessonContextType {
  currentLesson: LessonModel | null;
  lessons: LessonModel[];
  loading: boolean; // General loading for fetch/refresh
  isGeneratingInitial: boolean; // Specific loading for initial generation
  error: string | null;
  initialized: boolean; // Tracks if lessons have been fetched *at least once* successfully for the current session/conditions
  clearError: () => void;
  getLessons: () => Promise<LessonModel[] | undefined>; // Renamed from refreshLessons for clarity
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
  refreshLessons: () => Promise<LessonModel[]>; // Keep refreshLessons exposed if needed externally
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const { uploadFile } = useUpload();
  const { user } = useAuth();
  const { isOnboardingComplete, onboarding } = useOnboarding();
  const { status: appInitializerStatus } = useAppInitializer();
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingInitial, setIsGeneratingInitial] = useState(false); // New state
  const [initialGenerationAttempted, setInitialGenerationAttempted] = useState(false); // New state
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { showError } = useError();
  const pathname = usePathname();

  const callAction = useCallback(async <T,>(
    action: () => Promise<Result<T>>,
    setGlobalLoading = true // Default to setting the main loading state
  ): Promise<T> => {
    if (setGlobalLoading) setLoading(true);
    setError(null);
    try {
      const { data, error: actionError } = await action(); // Renamed error variable
      if (actionError) {
        setError(actionError);
        showError(actionError);
        throw new Error(actionError);
      }
      if (data === undefined) {
        // Allow undefined for void actions like delete
        if (action.toString().includes('deleteLessonAction')) {
          return undefined as T; // Return undefined for void actions
        }
        throw new Error('Action returned successfully but with undefined data.');
      }
      return data;
    } catch (err) {
      // Avoid double-setting/showing error if it was already handled above
      if (!(err instanceof Error && error === err.message)) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        showError(message);
      }
      throw err; // Re-throw the original error
    } finally {
      if (setGlobalLoading) setLoading(false);
    }
  }, [showError, error]); // Added `error` dependency

  const getLessons = useCallback(async (): Promise<LessonModel[]> => {
    logger.info('LessonContext: getLessons called...');

    // --- Pre-conditions for fetching ---
    if (appInitializerStatus !== 'idle') {
      logger.warn('LessonContext: Skipping getLessons, app not initialized.');
      return lessons;
    }
    if (!user) {
      logger.warn('LessonContext: Skipping getLessons, no user.');
      setLessons([]);
      setInitialized(false);
      setInitialGenerationAttempted(false); // Reset generation attempt on user change
      return [];
    }
    if (!isOnboardingComplete) {
      logger.warn('LessonContext: Skipping getLessons, onboarding not complete.');
      setLessons([]);
      setInitialized(false);
      setInitialGenerationAttempted(false); // Reset generation attempt
      return [];
    }
    if (pathname !== '/app/lessons') {
      logger.info('LessonContext: Skipping getLessons, not on lessons page.', { pathname });
      return lessons;
    }
    // --- End Pre-conditions ---

    logger.info('LessonContext: Conditions met, proceeding with lesson fetch.');
    setLoading(true); // Set loading before the fetch attempt
    setError(null);
    let generatedLessons: LessonModel[] | undefined; // Variable to hold generated lessons if needed

    try {
      const { data: fetchedLessons, error: fetchError } = await getLessonsAction();

      if (fetchError) {
        setError(fetchError);
        showError(fetchError);
        setLessons([]);
        setInitialized(false); // Consider if initialization should fail here
        setInitialGenerationAttempted(false); // Reset on error
        setLoading(false);
        return [];
      }

      const currentLessons = fetchedLessons || [];
      setLessons(currentLessons);
      setInitialized(true); // Mark as initialized *after* successful fetch
      logger.info(`LessonContext: Fetched lessons, count: ${currentLessons.length}. Initialized: true.`);

      // --- Initial Generation Logic ---
      if (currentLessons.length === 0 && !initialGenerationAttempted) {
        logger.info("LessonContext: No lessons found and generation not attempted. Triggering initial generation.");
        setInitialGenerationAttempted(true); // Mark attempt *before* calling action
        setIsGeneratingInitial(true); // Set specific loading state
        setLoading(false); // Turn off general loading while generating

        try {
          // Use callAction for generation as well, but don't set global loading
          generatedLessons = await callAction(() => generateInitialLessonsAction(), false);

          if (generatedLessons) {
            setLessons(generatedLessons); // Update state with newly generated lessons
            logger.info(`LessonContext: Successfully generated ${generatedLessons.length} initial lessons.`);
          } else {
            // This case means callAction caught an error or returned undefined unexpectedly
            logger.warn('LessonContext: generateInitialLessonsAction call resulted in undefined data or error was handled by callAction.');
            // Error state should already be set by callAction if there was an error
            // Keep lessons empty
          }
        } catch (genErr) {
          // Catch unexpected errors during the action call itself (if callAction re-throws)
          const message = genErr instanceof Error ? genErr.message : 'Unknown generation error';
          // Error state/toast is likely already handled by callAction, just log here
          logger.error('LessonContext: Unexpected error during initial lesson generation call', { genErr });
        } finally {
          setIsGeneratingInitial(false); // Reset generation loading state
        }
        // Return the lessons state *after* generation attempt
        setLoading(false); // Ensure loading is false after generation attempt
        return lessons; // Return the current state of lessons (might be generated or empty on error)
      }
      // --- End Initial Generation Logic ---

      setLoading(false); // Turn off general loading if fetch was successful and no generation needed
      return currentLessons;

    } catch (refreshError) {
      // This catch block might be redundant if callAction handles errors, but keep for safety
      logger.error('LessonContext: Unexpected error during getLessons process', refreshError);
      const message = refreshError instanceof Error ? refreshError.message : 'Failed to load lessons';
      setError(message);
      showError(message);
      setLessons([]);
      setInitialized(false);
      setInitialGenerationAttempted(false);
      setLoading(false);
      setIsGeneratingInitial(false);
      return [];
    }
  }, [
    // Dependencies for getLessons useCallback
    appInitializerStatus,
    user,
    isOnboardingComplete,
    pathname,
    initialGenerationAttempted,
    callAction, // callAction is stable if its dependencies are correct
    lessons, // Include lessons if returned directly
    showError, // Include showError from useError
    error // Include error state if used within callAction's dependency array
  ]);

  // Effect to trigger initial fetch/refresh based on conditions
  useEffect(() => {
    logger.debug('LessonProvider: Initial fetch effect triggered.', { appInitializerStatus, user: !!user, isOnboardingComplete, pathname, initialized });

    if (
      appInitializerStatus === 'idle' &&
      user &&
      isOnboardingComplete &&
      pathname === '/app/lessons' &&
      !initialized // Only run if not yet initialized under these conditions
    ) {
      logger.info('LessonProvider: Conditions met for initial lesson fetch/refresh.');
      getLessons(); // Call getLessons which now contains fetch and generation logic
    } else {
      logger.debug('LessonProvider: Conditions not met for initial fetch/refresh.');
    }

    // Reset state if user logs out or app initializer status changes from idle
    if (!user || (appInitializerStatus !== 'idle' && appInitializerStatus !== 'initializing')) {
      if (initialized || lessons.length > 0 || isGeneratingInitial || initialGenerationAttempted) {
        logger.info('LessonProvider: Resetting lessons state due to user logout or app status change.');
        setLessons([]);
        setCurrentLesson(null);
        setInitialized(false);
        setError(null);
        setIsGeneratingInitial(false);
        setInitialGenerationAttempted(false); // Reset generation flag
      }
    }

  }, [appInitializerStatus, user, isOnboardingComplete, pathname, initialized, getLessons]); // Use getLessons as dependency

  // --- Other context methods (remain largely unchanged) ---

  const getLessonById = async (id: string): Promise<LessonModel | null> => {
    // Use callAction for consistency, though individual loading might not be needed here
    const lesson = await callAction(() => getLessonByIdAction(id), false); // Don't set global loading
    setCurrentLesson(lesson ?? null); // Handle potential undefined from callAction
    return lesson ?? null;
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

  const checkAndGenerateNewLessons = useCallback(async (): Promise<void> => {
    // Use callAction to handle loading/errors for the generation check itself
    logger.info("LessonContext: Checking and generating new lessons...");
    try {
      // Don't set global loading for this background check
      const newLessons = await callAction(() => checkAndGenerateNewLessonsAction(), false);
      if (newLessons && newLessons.length > 0) {
        // Refresh the list to include the new lessons
        await getLessons(); // Call getLessons to update the state
        toast.success('New lessons generated based on your progress!');
      } else {
        logger.info("checkAndGenerateNewLessonsAction completed but returned no new lessons.");
        // Optionally inform the user if needed, or just refresh silently
        // Consider if a refresh is needed even if no new lessons are generated
        // await getLessons(); // Refresh even if no new lessons generated? Maybe not needed.
      }
    } catch (error) {
      logger.error("LessonContext: Error during checkAndGenerateNewLessons", error);
      // Error is handled by callAction
    }
  }, [callAction, getLessons]); // Add dependencies

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
    // Trigger check for new lessons after completion
    checkAndGenerateNewLessons(); // Call this after a lesson is completed
    return lesson;
  };

  const deleteLesson = async (lessonId: string): Promise<void> => {
    await callAction(() => deleteLessonAction(lessonId)); // callAction handles void return
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
    // Use callAction for consistency if desired, or keep direct call
    const history = await callAction(() => getStepHistoryAction(
      lessonId,
      stepId
    ), false); // No global loading
    return history;
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

  // Expose refreshLessons which is just an alias for getLessons now
  const refreshLessons = getLessons;

  return (
    <LessonContext.Provider
      value={{
        currentLesson,
        lessons,
        loading,
        isGeneratingInitial, // Expose new state
        error,
        initialized,
        clearError,
        getLessons, // Expose getLessons
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
        refreshLessons, // Keep alias if used elsewhere
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
