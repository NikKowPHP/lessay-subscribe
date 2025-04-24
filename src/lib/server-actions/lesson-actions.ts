'use server';

import LessonService from '@/services/lesson.service';
import { LessonRepository } from '@/repositories/lesson.repository';
import { LessonModel, LessonStep } from '@/models/AppAllModels.model';
import { OnboardingModel } from '@/models/AppAllModels.model';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';
import { OnboardingRepository } from '@/repositories/onboarding.repository';
import logger from '@/utils/logger';
import LessonGeneratorService from '@/services/lesson-generator.service';
import AIService from '@/services/ai.service';
import { GoogleTTS } from '@/services/google-tts.service';
import { uploadFile } from '@/utils/vercel_blob-upload';
import { withServerErrorHandling, Result } from './_withErrorHandling'
import { revalidatePath } from 'next/cache';

// TODO: Convert to container
function createLessonService() {
  const repository = new LessonRepository();
  return new LessonService(
    repository,
    new LessonGeneratorService(new AIService(), new GoogleTTS(), uploadFile),
    new OnboardingRepository()
  );
}

export async function getLessonsAction(): Promise<Result<LessonModel[]>> {
  return withServerErrorHandling(async () => {
    const svc = createLessonService()
    return await svc.getLessons()
  })
}

export async function getLessonByIdAction(lessonId: string): Promise<Result<LessonModel | null>> {
  return withServerErrorHandling(async () => {
    if (!lessonId) throw new Error('Lesson ID is required');
    const svc = createLessonService();
    return await svc.getLessonById(lessonId);
  });
}

export async function createLessonAction(data: {
  focusArea: string;
  targetSkills: string[];
  steps: LessonStep[];
}): Promise<Result<LessonModel>> {
  return withServerErrorHandling(async () => {
    if (!data.focusArea || !data.targetSkills.length || !data.steps.length) {
      throw new Error('All lesson data is required');
    }
    const svc = createLessonService();
    return await svc.createLesson(data);
  });
}

export async function updateLessonAction(
  lessonId: string,
  lessonData: Partial<LessonModel>
): Promise<Result<LessonModel>> {
  return withServerErrorHandling(async () => {
    if (!lessonId) throw new Error('Lesson ID is required');
    const svc = createLessonService();
    return await svc.updateLesson(lessonId, lessonData);
  });
}

export async function completeLessonAction(
  lessonId: string
): Promise<Result<LessonModel>> {
  return withServerErrorHandling(async () => {
    if (!lessonId) throw new Error('Lesson ID is required');
    const svc = createLessonService();
    return await svc.completeLesson(lessonId);
  });
}

export async function deleteLessonAction(lessonId: string): Promise<Result<null>> {
  return withServerErrorHandling(async () => {
    if (!lessonId) throw new Error('Lesson ID is required');
    const svc = createLessonService();
    await svc.deleteLesson(lessonId);
    return null;
  });
}

export async function generateInitialLessonsAction(): Promise<Result<LessonModel[]>> {
  return withServerErrorHandling(async () => {
    logger.info('generateInitialLessonsAction: Triggered.');
    const lessonService = createLessonService();
    const generatedLessons = await lessonService.generateInitialLessons();
    logger.info(`generateInitialLessonsAction: Generated ${generatedLessons.length} lessons.`);
    return generatedLessons;
  });
}

export async function recordStepAttemptAction(
  lessonId: string,
  stepId: string,
  userResponse: string
): Promise<Result<LessonStep>> {
  return withServerErrorHandling(async () => {
    if (!lessonId || !stepId) throw new Error('Lesson ID and Step ID are required');
    const svc = createLessonService();
    return await svc.recordStepAttempt(lessonId, stepId, userResponse);
  });
}

export async function getStepHistoryAction(
  lessonId: string,
  stepId: string
): Promise<Result<LessonStep[]>> {
  return withServerErrorHandling(async () => {
    if (!lessonId || !stepId) {
      throw new Error('Lesson ID and Step ID are required');
    }
    const svc = createLessonService();
    return await svc.getStepHistory(lessonId, stepId);
  });
}

export async function generateNewLessonsAction(): Promise<Result<LessonModel[]>> {
  return withServerErrorHandling(async () => {
    const svc = createLessonService();
    return await svc.generateNewLessonsBasedOnProgress();
  });
}

export async function checkAndGenerateNewLessonsAction(): Promise<Result<LessonModel[]>> {
  return withServerErrorHandling(async () => {
    const svc = createLessonService();
    const newLessons = await svc.checkAndGenerateNewLessons();
    // Revalidate the lessons page path to show new lessons
    revalidatePath('/app/lessons');
    return newLessons;
  });
}

export async function processLessonRecordingAction(
  sessionRecording: Blob | null, // <-- Allow null
  recordingTime: number | null,  // <-- Allow null
  recordingSize: number | null,  // <-- Allow null
  lesson: LessonModel
): Promise<Result<LessonModel>> {
  return withServerErrorHandling(async () => {
    // validateLessonRecording(sessionRecording, recordingTime, recordingSize, lesson);
    const svc = createLessonService();
    return await svc.processLessonRecording(
      sessionRecording,
      recordingTime,
      recordingSize,
      lesson
    );
  });
}

function validateLessonRecording(
  sessionRecording: Blob | null,
  recordingTime: number | null,
  recordingSize: number ,
  lesson: LessonModel
) {

  if (!lesson) {
    throw new Error('No lesson provided');
  }
  if (!recordingTime) {
    throw new Error('No recording time provided');
  }
  if (!recordingSize) {
    throw new Error('No recording size provided');
  }
}
