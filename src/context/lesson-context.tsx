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
import Cookies from 'js-cookie';
import { getAccessToken } from '@/utils/get-access-token-cookie.util';

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
      const fetchedLessons = await getLessonsAction(getAccessToken());
      setLessons(fetchedLessons);
      return fetchedLessons;
    });
  };

  const getLessonById = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      const lesson = await getLessonByIdAction(lessonId, getAccessToken());
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
      const newLesson = await createLessonAction(lessonData, getAccessToken());
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
      const updatedLesson = await updateLessonAction(
        lessonId, 
        lessonData, 
        getAccessToken()
      );
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
      const completedLesson = await completeLessonAction(
        lessonId, 
        getAccessToken()
      );
      setLessons((prevLessons) =>
        prevLessons.map((lesson) =>
          lesson.id === lessonId ? completedLesson : lesson
        )
      );
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(completedLesson);
      }
      return completedLesson;
    });
  };

  const deleteLesson = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      await deleteLessonAction(lessonId, getAccessToken());
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
  ) => {
    return withLoadingAndErrorHandling(async () => {
      const updatedStep = await recordStepAttemptAction(
        lessonId,
        stepId,
        userResponse,
        getAccessToken()
      );
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
      const history = await getStepHistoryAction(
        lessonId, 
        stepId, 
        getAccessToken()
      );
      return history;
    });
  };

  const clearError = () => setError(null);

  // Add new method to check if all lessons are complete and generate new ones
  const checkAndGenerateNewLessons = async () => {
    try {
      const newLessons = await checkAndGenerateNewLessonsAction(getAccessToken());
      setLessons((prevLessons) => [...newLessons, ...prevLessons]);
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
      updateLessonAction(
        lesson.id, 
        { sessionRecordingUrl: uploadedAudioUrl }, 
        getAccessToken()
      );
    }
    logger.info('processLessonRecording in context', {
      sessionRecording,
      recordingTime,
      recordingSize,
      lesson,
    });
    const lessonWithAudioMetrics = await processLessonRecordingAction(
      sessionRecording,
      recordingSize,
      recordingTime,
      lesson,
      getAccessToken()
    );
    logger.info('lessonWithAudioMetrics', { lessonWithAudioMetrics });
    return lessonWithAudioMetrics;
    // TODO: sync when generating new lessons
    // TODO: each target langauge should have its own onboarding, and data
  };

  // Upload file for slider items – only processes the image file.
  const uploadFilesToStorage = useCallback(
    async (data: Blob): Promise<string> => {
      const file = new File([data], `recording-${Date.now()}.webm`, {
        type: data.type,
      });

      let recordingUrl = null;
      if(true) {
      // if (process.env.NEXT_PUBLIC_MOCK_UPLOADS === 'true') {
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
