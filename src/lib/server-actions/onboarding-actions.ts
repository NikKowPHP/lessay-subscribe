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
import { cookies } from 'next/headers';

/**
 * Helper function to retrieve the access token from the request cookies.
 */
async function getAccessTokenFromRequest() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (!accessToken) {
    logger.error('No access token found in cookies');
    throw new Error('Authentication required');
  }
  return accessToken;
}

/**
 * Creates an instance of the OnboardingService using the Supabase Auth
 * based on the environment. If an access token is not provided, it is
 * retrieved from the request cookies.
 */
async function createOnboardingService(accessTokenParam?: string) {
  const accessToken = accessTokenParam ?? (await getAccessTokenFromRequest());
  const repository = new OnboardingRepository(
    getAuthServiceBasedOnEnvironment(accessToken)
  );
  const lessonRepository = new LessonRepository(
    getAuthServiceBasedOnEnvironment(accessToken)
  );
  return new OnboardingService(
    repository,
    new LessonService(
      lessonRepository,
      new LessonGeneratorService(new AIService(), new GoogleTTS()),
      repository
    ),
    new AssessmentGeneratorService(new AIService(), new GoogleTTS())
  );
}

export async function createOnboardingAction() {
  const onboardingService = await createOnboardingService();
  return await onboardingService.createOnboarding();
}

export async function getOnboardingAction() {
  const onboardingService = await createOnboardingService();
  const onboarding = await onboardingService.getOnboarding();
  logger.log('current onboarding:', onboarding);
  return onboarding;
}

export async function updateOnboardingAction(step: string, formData: any) {
  if (!step) {
    throw new Error('Step is required');
  }
  const onboardingService = await createOnboardingService();
  const updatedOnboarding = await onboardingService.updateOnboarding(step, formData);
  logger.log('updated onboarding:', updatedOnboarding);
  return updatedOnboarding;
}

export async function markOnboardingCompleteAndGenerateInitialLessonsAction() {
  logger.info('marking onboarding complete and generating initial lessons');
  const onboardingService = await createOnboardingService();
  const completedOnboarding = await onboardingService.markOnboardingAsCompleteAndGenerateLessons();
  logger.info('completed onboarding:', completedOnboarding);
  return completedOnboarding;
}

export async function deleteOnboardingAction() {
  const onboardingService = await createOnboardingService();
  const deletedOnboarding = await onboardingService.deleteOnboarding();
  logger.log('deleted onboarding:', deletedOnboarding);
  return deletedOnboarding;
}

export async function getStatusAction() {
  const onboardingService = await createOnboardingService();
  const status = await onboardingService.getStatus();
  logger.log('status:', status);
  return status;
}

export async function getAssessmentLessonAction() {
  const onboardingService = await createOnboardingService();
  const authService = getAuthServiceBasedOnEnvironment(await getAccessTokenFromRequest());
  const session = await authService.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }
  const lesson = await onboardingService.getAssessmentLesson(session.user.id);
  logger.log('assessment lesson:', lesson);
  return lesson;
}

export async function completeAssessmentLessonAction(
  lessonId: string,
  userResponse: string
) {
  const onboardingService = await createOnboardingService();
  const completedLesson = await onboardingService.completeAssessmentLesson(lessonId, userResponse);
  logger.log('completed lesson:', completedLesson);
  return completedLesson;
}

export async function recordAssessmentStepAttemptAction(
  lessonId: string,
  stepId: string,
  userResponse: string
) {
  if (!lessonId || !stepId) {
    throw new Error('Lesson ID and Step ID are required');
  }
  const onboardingService = await createOnboardingService();
  return await onboardingService.recordStepAttempt(lessonId, stepId, userResponse);
}

export async function updateOnboardingLessonAction(
  lessonId: string,
  lessonData: Partial<AssessmentLesson>
) {
  if (!lessonId) {
    throw new Error('Lesson ID is required');
  }
  const onboardingService = await createOnboardingService();
  return await onboardingService.updateOnboardingAssessmentLesson(lessonId, lessonData);
}

export async function processAssessmentLessonRecordingAction(
  sessionRecording: Blob,
  lesson: AssessmentLesson,
  recordingTime: number,
  recordingSize: number
) {
  try {
    validateAssessmentRecording(sessionRecording, recordingTime, recordingSize, lesson);
    const onboardingService = await createOnboardingService();
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

/**
 * Validates the assessment recording parameters.
 */
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
