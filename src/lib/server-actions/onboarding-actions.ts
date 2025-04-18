'use server';

import OnboardingService from '@/services/onboarding.service';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import AIService from '@/services/ai.service';
import AssessmentGeneratorService from '@/services/assessment-generator.service';
import { GoogleTTS } from '@/services/google-tts.service';
import LessonGeneratorService from '@/services/lesson-generator.service';
import { AssessmentLesson, AssessmentStep, OnboardingModel } from '@/models/AppAllModels.model';
import { uploadFile } from '@/utils/vercel_blob-upload';
import logger from '@/utils/logger';
import { withServerErrorHandling, Result } from './_withErrorHandling';

function createOnboardingService() {
  const repo = new OnboardingRepository();
  const lessonRepo = new LessonRepository();
  return new OnboardingService(
    repo,
    new LessonService(
      lessonRepo,
      new LessonGeneratorService(new AIService(), new GoogleTTS(), uploadFile),
      repo
    ),
    new AssessmentGeneratorService(new AIService(), new GoogleTTS(), uploadFile)
  );
}

// Create
export async function createOnboardingAction(): Promise<Result<OnboardingModel>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.createOnboarding();
  });
}

// Read
export async function getOnboardingAction(): Promise<Result<OnboardingModel | null>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.getOnboarding();
  });
}

// Update a single step
export async function updateOnboardingAction(
  step: string,
  formData: any
): Promise<Result<OnboardingModel>> {
  return withServerErrorHandling(async () => {
    if (!step) throw new Error('Step is required');
    const svc = createOnboardingService();
    const updated = await svc.updateOnboarding(step, formData);
    logger.log('updated onboarding:', updated);
    return updated;
  });
}

// Delete
export async function deleteOnboardingAction(): Promise<Result<void>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    const deleted = await svc.deleteOnboarding();
    logger.log('deleted onboarding:', deleted);
    return deleted;
  });
}

// Mark complete + generate lessons
export async function markOnboardingCompleteAndGenerateInitialLessonsAction(): Promise<Result<OnboardingModel>> {
  return withServerErrorHandling(async () => {
    logger.info('marking onboarding complete and generating initial lessons');
    const svc = createOnboardingService();
    const completed = await svc.markOnboardingAsCompleteAndGenerateLessons();
    logger.info('completed onboarding:', completed);
    return completed;
  });
}

// Status flag
export async function getStatusAction(): Promise<Result<boolean>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.getStatus();
  });
}

// Assessment lesson fetch/complete/record/etc.
export async function getAssessmentLessonAction(): Promise<Result<AssessmentLesson>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.getAssessmentLesson();
  });
}

export async function completeAssessmentLessonAction(
  lessonId: string,
  userResponse: string
): Promise<Result<AssessmentLesson>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.completeAssessmentLesson(lessonId, userResponse);
  });
}

export async function recordAssessmentStepAttemptAction(
  lessonId: string,
  stepId: string,
  userResponse: string
): Promise<Result<AssessmentStep>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.recordStepAttempt(lessonId, stepId, userResponse);
  });
}

export async function updateOnboardingLessonAction(
  lessonId: string,
  lessonData: Partial<AssessmentLesson>
): Promise<Result<AssessmentLesson>> {
  return withServerErrorHandling(async () => {
    const svc = createOnboardingService();
    return await svc.updateOnboardingAssessmentLesson(lessonId, lessonData);
  });
}

export async function processAssessmentLessonRecordingAction(
  sessionRecording: Blob,
  lesson: AssessmentLesson,
  recordingTime: number,
  recordingSize: number
): Promise<Result<AssessmentLesson>> {
  return withServerErrorHandling(async () => {
    if (!sessionRecording)   throw new Error('No session recording provided');
    if (!lesson)             throw new Error('No assessment lesson provided');
    if (!recordingTime)      throw new Error('No recording time provided');
    if (!recordingSize)      throw new Error('No recording size provided');

    const svc = createOnboardingService();
    return await svc.processAssessmentLessonRecording(
      sessionRecording,
      lesson,
      recordingTime,
      recordingSize
    );
  });
}