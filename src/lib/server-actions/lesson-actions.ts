'use server'

import LessonService from '@/services/lesson.service'
import { LessonRepository } from '@/repositories/lesson.repository'
import { getAuthServiceBasedOnEnvironment  } from '@/services/supabase-auth.service'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import { OnboardingModel } from '@/models/AppAllModels.model'
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock'

function createLessonService() {
  const repository = new LessonRepository(getAuthServiceBasedOnEnvironment())
  return new LessonService(repository, MockLessonGeneratorService)
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
  sequence: LessonStep[]
}) {
  if (!lessonData.focusArea || !lessonData.targetSkills || !lessonData.sequence) {
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