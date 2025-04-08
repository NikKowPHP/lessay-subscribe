'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createOnboardingAction,
  updateOnboardingAction,
  getStatusAction,
  getAssessmentLessonAction,
  completeAssessmentLessonAction,
  getOnboardingAction,
  markOnboardingCompleteAndGenerateInitialLessonsAction,
  recordAssessmentStepAttemptAction,
  updateOnboardingLessonAction,
  processAssessmentLessonRecordingAction
} from '@/lib/server-actions/onboarding-actions';
import logger from '@/utils/logger';
import { AssessmentLesson, AssessmentStep, OnboardingModel } from '@/models/AppAllModels.model';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
import { useUpload } from '@/hooks/use-upload';
import { useAuth } from './auth-context';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  goToLessonsWithOnboardingComplete: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
  markStepComplete: (step: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  getOnboarding: () => Promise<OnboardingModel | null>;
  getAssessmentLesson: () => Promise<AssessmentLesson>;
  completeAssessmentLesson: (
    lessonId: string,
    userResponse: string
  ) => Promise<AssessmentLesson>;
  markOnboardingAsCompleteAndGenerateLessons: () => Promise<void>;
  onboarding: OnboardingModel | null;
  recordAssessmentStepAttempt: (
    lessonId: string,
    stepId: string,
    userResponse: string,
    correct?: boolean

  ) => Promise<AssessmentStep>;
  processAssessmentLessonRecording: (
    recording: RecordingBlob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
  ) => Promise<AssessmentLesson>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingModel | null>(null);
  const router = useRouter();

  const { user } = useAuth();

  const { uploadFile } = useUpload();

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

  const checkOnboardingStatus = async () => {
    return withLoadingAndErrorHandling(async () => {
      const status = await getStatusAction();
      setIsOnboardingComplete(status);
      return status;
    });
  };

  const startOnboarding = async () => {
    return withLoadingAndErrorHandling(async () => {
      await createOnboardingAction();
      setIsOnboardingComplete(false);
    });
  };

  const markStepComplete = async (step: string) => {
    return withLoadingAndErrorHandling(async () => {
      await updateOnboardingAction(step);
      await checkOnboardingStatus();
    });
  };

  const clearError = () => setError(null);

  const getAssessmentLesson = async () => {
    return withLoadingAndErrorHandling(async () => {
      return await getAssessmentLessonAction();
    });
  };

  const completeAssessmentLesson = async (
    lessonId: string,
    userResponse: string
  ) => {
    return withLoadingAndErrorHandling(async () => {
      return await completeAssessmentLessonAction(lessonId, userResponse);
    });
  };

  const markOnboardingAsCompleteAndGenerateLessons = async () => {
    return withLoadingAndErrorHandling(async () => {
      const completedOnboarding = await markOnboardingCompleteAndGenerateInitialLessonsAction();
      setOnboarding(completedOnboarding);
      toast.success(
        'Onboarding completed! Lessons generated!'
      );
    });
  };

  const getOnboarding = async () => {
    return withLoadingAndErrorHandling(async () => {
      const result = await getOnboardingAction();
      setOnboarding(result);
      return result;
    });
  };

  const recordAssessmentStepAttempt = async (
    lessonId: string,
    stepId: string,
    userResponse: string
  ) => {
    return withLoadingAndErrorHandling(async () => {
      return await recordAssessmentStepAttemptAction(lessonId, stepId, userResponse);
    });
  };

  const goToLessonsWithOnboardingComplete = async () => {
    setIsOnboardingComplete(true);
    router.push('/app/lessons');
  };


  const processAssessmentLessonRecording = async (
    sessionRecording: RecordingBlob,
    lesson: AssessmentLesson,
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
  
      updateOnboardingLessonAction(lesson.id, { sessionRecordingUrl: uploadedAudioUrl });
    }
    const lessonWithAudioMetrics = await processAssessmentLessonRecordingAction(
      sessionRecording,
      lesson,
      recordingSize,
      recordingTime
    );
    logger.info('lessonWithAudioMetrics', { lessonWithAudioMetrics });
    return lessonWithAudioMetrics;
    // TODO: sync when generating new lessons
    // TODO: each target langauge should have its own onboarding, and data
  };


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



  useEffect(() => {
   
    const initializeOnboarding = async () => {
      if(!user) return;
      try {
        const isComplete = await checkOnboardingStatus();
        if (isComplete) {
          // Redirect to lessons if onboarding is complete
          router.push('/app/lessons');
        } else {
          await startOnboarding();
          router.push('/app/onboarding');
        }
      } catch (error) {
        logger.error('Failed to initialize onboarding:', error);
      }
    };
    if(!user) router.replace('/app/login');

    initializeOnboarding();
  }, [user, router]);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        checkOnboardingStatus,
        markStepComplete,
        loading,
        error,
        clearError,
        getOnboarding,
        getAssessmentLesson,
        completeAssessmentLesson,
        markOnboardingAsCompleteAndGenerateLessons,
        onboarding,
        recordAssessmentStepAttempt,
        goToLessonsWithOnboardingComplete,
        processAssessmentLessonRecording
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
