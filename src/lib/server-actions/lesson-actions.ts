'use server'

import LessonService from '@/services/lesson.service'
import { LessonRepository } from '@/repositories/lesson.repository'
import { getAuthServiceBasedOnEnvironment  } from '@/services/supabase-auth.service'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import { OnboardingModel } from '@/models/AppAllModels.model'
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock'
import { OnboardingRepository } from '@/repositories/onboarding.repository'
import logger from '@/utils/logger'
import LessonGeneratorService from '@/services/lesson-generator.service'
import AIService from '@/services/ai.service'


// TODO: Convert to container
function createLessonService() {
  const repository = new LessonRepository(getAuthServiceBasedOnEnvironment())
  return new LessonService(repository, new LessonGeneratorService(new AIService(), true), new OnboardingRepository(getAuthServiceBasedOnEnvironment()))
}

export async function getLessonsAction() {
  const lessonService = createLessonService()
  return await lessonService.getLessons()
}

export async function getLessonByIdAction(lessonId: string) {
  if (!lessonId) {
    throw new Error('Lesson ID is required')
  }
  const lessonService = createLessonService()
  return await lessonService.getLessonById(lessonId)
}

export async function createLessonAction(lessonData: {
  focusArea: string
  targetSkills: string[]
  steps: LessonStep[]
}) {
  if (!lessonData.focusArea || !lessonData.targetSkills || !lessonData.steps) {
    throw new Error('All lesson data is required')
  }
  const lessonService = createLessonService()
  return await lessonService.createLesson(lessonData)
}

export async function updateLessonAction(lessonId: string, lessonData: Partial<LessonModel>) {
  if (!lessonId) {
    throw new Error('Lesson ID is required')
  }
  const lessonService = createLessonService()
  return await lessonService.updateLesson(lessonId, lessonData)
}

export async function completeLessonAction(
  lessonId: string,
  performanceMetrics?: {
    accuracy?: number
    pronunciationScore?: number
    errorPatterns?: string[]
  }
) {
  if (!lessonId) {
    throw new Error('Lesson ID is required')
  }
  const lessonService = createLessonService()
  return await lessonService.completeLesson(lessonId, performanceMetrics)
}

export async function deleteLessonAction(lessonId: string) {
  if (!lessonId) {
    throw new Error('Lesson ID is required')
  }
  const lessonService = createLessonService()
  return await lessonService.deleteLesson(lessonId)
}

export async function generateInitialLessonsAction(onboardingData: OnboardingModel) {
  if (!onboardingData) {
    throw new Error('Onboarding data is required')
  }
  
  const lessonService = createLessonService()
  return await lessonService.generateInitialLessons()
}

export async function recordStepAttemptAction(
  lessonId: string,
  stepId: string,
  // data: {
    userResponse: string
    // correct: boolean
    // errorPatterns?: string[]
  // }
) {
  if (!lessonId || !stepId) {
    throw new Error('Lesson ID and Step ID are required')
  }
  const lessonService = createLessonService()
  return await lessonService.recordStepAttempt(lessonId, stepId, userResponse)
}

export async function getStepHistoryAction(lessonId: string, stepId: string) {
  if (!lessonId || !stepId) {
    throw new Error('Lesson ID and Step ID are required')
  }
  const lessonService = createLessonService()
  return await lessonService.getStepHistory(lessonId, stepId)
}

export async function generateNewLessonsAction(): Promise<LessonModel[]> {
  const lessonService = createLessonService()
  
  try {
    // Use the existing function but modify for continuation learning
    return await lessonService.generateNewLessonsBasedOnProgress()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred while generating new lessons'
    logger.error(message)
    throw new Error(message)
  }
}