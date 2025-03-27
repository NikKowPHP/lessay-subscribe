'use server';
import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import {
  getAuthServiceBasedOnEnvironment,
  SupabaseAuthService,
} from '@/services/supabase-auth.service';
import { getSession } from '@/repositories/supabase/supabase';
import 'server-only';
import { MockAuthService } from '@/services/mock-auth-service.service';
import logger from '@/utils/logger';
import { generateInitialLessonsAction } from './lesson-actions';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';
import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import AIService from '@/services/ai.service';
import AssessmentStepGeneratorService from '@/services/assessment-step-generator.service';

function createOnboardingService() {
  const repository = new OnboardingRepository(
    getAuthServiceBasedOnEnvironment()
  );
  const lessonRepository = new LessonRepository(
    getAuthServiceBasedOnEnvironment()
  );
  return new OnboardingService(
    repository,
    new LessonService(lessonRepository, MockLessonGeneratorService, repository),
    new AssessmentStepGeneratorService(new AIService(), true)
  );
}

export async function createOnboardingAction() {
  const onboardingService = createOnboardingService();
  return await onboardingService.createOnboarding();
}

export async function getOnboardingAction() {
  const onboardingService = createOnboardingService();
  const onboarding = await onboardingService.getOnboarding();
  logger.log('current onboarding:', onboarding);
  return onboarding;
}

export async function updateOnboardingAction(step: string) {
  if (!step) {
    throw new Error('Step is required');
  }
  const onboardingService = createOnboardingService();
  const updatedOnboarding = await onboardingService.updateOnboarding(step);
  logger.log('updated onboarding:', updatedOnboarding);
  return updatedOnboarding;
}

export async function completeOnboardingAction() {
  const onboardingService = createOnboardingService();
  const completedOnboarding =
    await onboardingService.completeOnboardingWithLessons();

  logger.log('completed onboarding:', completedOnboarding);
  return completedOnboarding;
}

export async function deleteOnboardingAction() {
  const onboardingService = createOnboardingService();
  const deletedOnboarding = await onboardingService.deleteOnboarding();
  logger.log('deleted onboarding:', deletedOnboarding);
  return deletedOnboarding;
}

export async function getStatusAction() {
  const onboardingService = createOnboardingService();
  const status = await onboardingService.getStatus();
  logger.log('status:', status);
  return status;
}

export async function getAssessmentLessonAction() {
  const authService = getAuthServiceBasedOnEnvironment();
  const session = await authService.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const onboardingService = createOnboardingService();

  const lesson = await onboardingService.getAssessmentLesson(session.user.id);
  logger.log('lessons:', lesson);
  return lesson;
}

export async function completeAssessmentLessonAction(
  lessonId: string,
  userResponse: string
) {
  const onboardingService = createOnboardingService();
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
  userResponse: string
) {
  if (!lessonId || !stepId) {
    throw new Error('Lesson ID and Step ID are required');
  }
  const onboardingService = createOnboardingService();

  return await onboardingService.recordStepAttempt(
    lessonId,
    stepId,
    userResponse
  );
}
