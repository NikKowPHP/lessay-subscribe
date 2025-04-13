'use server';
import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import {
  getAuthServiceBasedOnEnvironment,
} from '@/services/supabase-auth.service';
import 'server-only';
import logger from '@/utils/logger';
import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import AIService from '@/services/ai.service';
import AssessmentGeneratorService from '@/services/assessment-generator.service';
import { GoogleTTS } from '@/services/google-tts.service';
import LessonGeneratorService from '@/services/lesson-generator.service';
import { AssessmentLesson } from '@/models/AppAllModels.model';


function createOnboardingService(accessToken?: string) {
  const repository = new OnboardingRepository(
    getAuthServiceBasedOnEnvironment(accessToken)
  );
  const lessonRepository = new LessonRepository(
    getAuthServiceBasedOnEnvironment(accessToken)
  );
  return new OnboardingService(
    repository,
    new LessonService(lessonRepository, new LessonGeneratorService(new AIService(), new GoogleTTS()), repository),
    new AssessmentGeneratorService(new AIService(), new GoogleTTS())
  );
}

export async function createOnboardingAction(accessToken?: string) {
  const onboardingService = createOnboardingService(accessToken);
  return await onboardingService.createOnboarding();
}

export async function getOnboardingAction(accessToken?: string) {
  const onboardingService = createOnboardingService(accessToken);
  const onboarding = await onboardingService.getOnboarding();
  logger.log('current onboarding:', onboarding);
  return onboarding;
}

export async function updateOnboardingAction(step: string, formData: any, accessToken?: string) {
  if (!step) {
    throw new Error('Step is required');
  }
  const onboardingService = createOnboardingService(accessToken);
  const updatedOnboarding = await onboardingService.updateOnboarding(step, formData);
  logger.log('updated onboarding:', updatedOnboarding);
  return updatedOnboarding;
}


export async function markOnboardingCompleteAndGenerateInitialLessonsAction(accessToken?: string) {
  logger.info('marking onboarding complete and generating initial lessons');
  const onboardingService = createOnboardingService(accessToken);
  const completedOnboarding =
    await onboardingService.markOnboardingAsCompleteAndGenerateLessons();
  logger.info('completed onboarding:', completedOnboarding);
  return completedOnboarding;
}

export async function deleteOnboardingAction(accessToken?: string) {
  const onboardingService = createOnboardingService(accessToken);
  const deletedOnboarding = await onboardingService.deleteOnboarding();
  logger.log('deleted onboarding:', deletedOnboarding);
  return deletedOnboarding;
}

export async function getStatusAction(accessToken?: string) {
  const onboardingService = createOnboardingService(accessToken);
  const status = await onboardingService.getStatus();
  logger.log('status:', status);
  return status;
}

export async function getAssessmentLessonAction(accessToken?: string) {
  const authService = getAuthServiceBasedOnEnvironment();
  const session = await authService.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const onboardingService = createOnboardingService(accessToken);

  const lesson = await onboardingService.getAssessmentLesson(session.user.id);
  logger.log('lessons:', lesson);
  return lesson;
}

export async function completeAssessmentLessonAction(
  lessonId: string,
  userResponse: string,
  accessToken?: string
) {
  const onboardingService = createOnboardingService(accessToken);
  const completedLesson = await onboardingService.completeAssessmentLesson(
    lessonId,
    userResponse
  );
  logger.log('completed lesson:', completedLesson);
  return completedLesson;
}

export async function recordAssessmentStepAttemptAction(
  lessonId: string,
  stepId: string,
  userResponse: string,
  accessToken?: string
) {
  if (!lessonId || !stepId) {
    throw new Error('Lesson ID and Step ID are required');
  }
  const onboardingService = createOnboardingService(accessToken);

  return await onboardingService.recordStepAttempt(
    lessonId,
    stepId,
    userResponse
  );
}

export async function updateOnboardingLessonAction(lessonId: string, lessonData: Partial<AssessmentLesson>, accessToken?: string) {
  if (!lessonId) {
    throw new Error('Lesson ID is required')
  }
  const onboardingService = createOnboardingService(accessToken);
  return await onboardingService.updateOnboardingAssessmentLesson(lessonId, lessonData)
}


export async function processAssessmentLessonRecordingAction(
  sessionRecording: Blob,
  lesson: AssessmentLesson,
  recordingTime: number,
  recordingSize: number,
  accessToken?: string
) {
  try {
    validateAssessmentRecording(sessionRecording, recordingTime, recordingSize, lesson);
    const onboardingService = createOnboardingService(accessToken);
    return await onboardingService.processAssessmentLessonRecording(
      sessionRecording,
      lesson,
      recordingTime,
      recordingSize
    );
  } catch (error) {
    throw new Error("Error processing assessment recording: " + error);
  }
}

function validateAssessmentRecording(
  sessionRecording: Blob,
  recordingTime: number,
  recordingSize: number,
  lesson: AssessmentLesson
) {
  if (!sessionRecording) {
    throw new Error("No session recording provided");
  }
  if (!lesson) {
    throw new Error("No assessment lesson provided");
  }
  if (!recordingTime) {
    throw new Error("No recording time provided");
  }
  if (!recordingSize) {
    throw new Error("No recording size provided");
  }
}
