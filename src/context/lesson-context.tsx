'use client';

import { createContext, useCallback, useContext, useState } from 'react';
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

interface LessonContextType {
  currentLesson: LessonModel | null;
  lessons: LessonModel[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  getLessons: () => Promise<LessonModel[]>;
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

  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null);
  const [lessons, setLessons] = useState<LessonModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const getLessons = async () => {
    return withLoadingAndErrorHandling(async () => {
      const fetchedLessons = await getLessonsAction();
      setLessons(fetchedLessons);
      return fetchedLessons;
    });
  };

  const getLessonById = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      const lesson = await getLessonByIdAction(lessonId);
      if (lesson) {
        setCurrentLesson(lesson);
      }
      return lesson;
    });
  };

  const createLesson = async (lessonData: {
    focusArea: string;
    targetSkills: string[];
    steps: LessonStep[];
  }) => {
    return withLoadingAndErrorHandling(async () => {
      const newLesson = await createLessonAction(lessonData);
      setLessons((prevLessons) => [newLesson, ...prevLessons]);
      setCurrentLesson(newLesson);
      return newLesson;
    });
  };

  const updateLesson = async (
    lessonId: string,
    lessonData: Partial<LessonModel>
  ) => {
    return withLoadingAndErrorHandling(async () => {
      const updatedLesson = await updateLessonAction(lessonId, lessonData);
      setLessons((prevLessons) =>
        prevLessons.map((lesson) =>
          lesson.id === lessonId ? updatedLesson : lesson
        )
      );
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(updatedLesson);
      }
      return updatedLesson;
    });
  };

  const completeLesson = async (
    lessonId: string,
    sessionRecording: Blob | null
  ) => {
    return withLoadingAndErrorHandling(async () => {
      const completedLesson = await completeLessonAction(lessonId);

      // const completedLesson = await completeLessonAction(lessonId, sessionRecording)
      setLessons((prevLessons) =>
        prevLessons.map((lesson) =>
          lesson.id === lessonId ? completedLesson : lesson
        )
      );
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(completedLesson);
      }

      // Check if all lessons are complete and generate new ones if needed
      await checkAndGenerateNewLessons();

      return completedLesson;
    });
  };

  const deleteLesson = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      await deleteLessonAction(lessonId);
      setLessons((prevLessons) =>
        prevLessons.filter((lesson) => lesson.id !== lessonId)
      );
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(null);
      }
    });
  };

  const recordStepAttempt = async (
    lessonId: string,
    stepId: string,
    userResponse: string
    // correct: boolean,
    // errorPatterns?: string[]
  ) => {
    return withLoadingAndErrorHandling(async () => {
      logger.info('recordStepAttempt in context', {
        lessonId,
        stepId,
        userResponse,
      });
      const updatedStep = await recordStepAttemptAction(
        lessonId,
        stepId,
        userResponse
      );
      logger.info('recordStepAttempt after updation', { updatedStep });
      // Optionally update the current lesson's step response locally:
      setCurrentLesson((prev) => {
        if (!prev) return prev;
        const updatedsteps = prev?.steps?.map((s) =>
          s.stepNumber === updatedStep.stepNumber ? { ...s, ...updatedStep } : s
        );
        return { ...prev, steps: updatedsteps };
      });
      return updatedStep;
    });
  };

  const getStepHistory = async (lessonId: string, stepId: string) => {
    return withLoadingAndErrorHandling(async () => {
      const history = await getStepHistoryAction(lessonId, stepId);
      return history;
    });
  };

  const clearError = () => setError(null);

  // Add new method to check if all lessons are complete and generate new ones
  const checkAndGenerateNewLessons = async () => {
    // First get the latest list of lessons
    // TODO: this should be done on the server
    const currentLessons = await getLessonsAction();

    // If there are no lessons or not all are complete, just return
    if (currentLessons.length === 0) return;

    const allComplete = currentLessons.every((lesson) => lesson.completed);

    if (!allComplete) return;

    logger.info('All lessons complete, generating new lessons');

    try {
      // Generate new lessons based on aggregated results
      const newLessons = await generateNewLessonsAction();

      // TODO: ui does only this check and sets the new lessons, or skips.
      // Update local state with new lessons
      setLessons((prevLessons) => [...newLessons, ...prevLessons]);

      // Notify user
      toast.success('New lessons generated based on your progress!');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate new lessons';
      logger.error(message);
      toast.error(message);
    }
  };

  const processLessonRecording = async (
    sessionRecording: RecordingBlob,
    lesson: LessonModel,
    recordingTime: number,
    recordingSize: number
  ) => {
    if (!sessionRecording) {
      throw new Error('No session recording provided');
    }
    if (lesson.audioMetrics) {
      return lesson;
    }
    if (!lesson.sessionRecordingUrl) {
      const uploadedAudioUrl = await uploadFilesToStorage(sessionRecording);
      lesson.sessionRecordingUrl = uploadedAudioUrl;
  
      // TODO: update lesson with sessionRecordingUrl
      updateLessonAction(lesson.id, { sessionRecordingUrl: uploadedAudioUrl });
    }
    const lessonWithAudioMetrics = await processLessonRecordingAction(
      sessionRecording,
      recordingTime,
      recordingSize,
      lesson
    );
    logger.info('lessonWithAudioMetrics', { lessonWithAudioMetrics });
    return lessonWithAudioMetrics;
  };

  // Upload file for slider items – only processes the image file.
  const uploadFilesToStorage = useCallback(
    async (data: Blob): Promise<string> => {
      const file = new File([data], `recording-${Date.now()}.webm`, {
        type: data.type,
      });

      let recordingUrl = null;
      if (process.env.NEXT_PUBLIC_MOCK_UPLOADS === 'true') {
        recordingUrl = `https://6jnegrfq8rkxfevo.public.blob.vercel-storage.com/products/images/1741514066709-2025-03-09_07-55-trAfuCDSuaW2aZYiXHgENMuGfGNdCo.png`;
      } else {
        recordingUrl = await uploadFile(file, 'lessay/sessionRecordings');
      }

      if (!recordingUrl) throw new Error('Missing recording URL');

      return  recordingUrl ;
    },
    [uploadFile]
  );

  return (
    <LessonContext.Provider
      value={{
        currentLesson,
        lessons,
        loading,
        error,
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
