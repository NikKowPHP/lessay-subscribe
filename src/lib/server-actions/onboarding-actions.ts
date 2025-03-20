'use server'
import OnboardingService from '@/services/onboarding.service'
import { OnboardingRepository } from '@/repositories/onboarding.repository'
import { getAuthServiceBasedOnEnvironment, SupabaseAuthService } from '@/services/supabase-auth.service'
import { getSession } from '@/repositories/supabase/supabase'
import 'server-only'
import { MockAuthService } from '@/services/mock-auth-service.service'
import logger from '@/utils/logger'
import { generateInitialLessonsAction } from './lesson-actions'
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock'
import LessonService from '@/services/lesson.service'
import { LessonRepository } from '@/repositories/lesson.repository'



function createOnboardingService() {
  const repository = new OnboardingRepository(getAuthServiceBasedOnEnvironment())
  const lessonRepository = new LessonRepository(getAuthServiceBasedOnEnvironment())
  return new OnboardingService(repository, new LessonService(lessonRepository, MockLessonGeneratorService, repository))
}

export async function createOnboardingAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.createOnboarding()
}

export async function getOnboardingAction() {
  const onboardingService = createOnboardingService()
  const onboarding = await onboardingService.getOnboarding()
  logger.log('current onboarding:', onboarding)
  return onboarding
}

export async function updateOnboardingAction(step: string) {
  if (!step) {
    throw new Error('Step is required')
  }
  const onboardingService = createOnboardingService()
  const updatedOnboarding = await onboardingService.updateOnboarding(step)
  logger.log('updated onboarding:', updatedOnboarding)
  return updatedOnboarding
}

export async function completeOnboardingAction() {
  const onboardingService = createOnboardingService()
  const completedOnboarding = await onboardingService.completeOnboarding()
  
  
  logger.log('completed onboarding:', completedOnboarding)
  return completedOnboarding
}

export async function deleteOnboardingAction() {
  const onboardingService = createOnboardingService()
  const deletedOnboarding = await onboardingService.deleteOnboarding()
  logger.log('deleted onboarding:', deletedOnboarding)
  return deletedOnboarding
}

export async function getStatusAction() {
  const onboardingService = createOnboardingService()
  const status = await onboardingService.getStatus()
  logger.log('status:', status)
  return status
}

export async function getAssessmentLessonsAction() {
  const onboardingService = createOnboardingService()
  const authService = getAuthServiceBasedOnEnvironment()
  const session = await authService.getSession()
  if (!session) {
    throw new Error('User not authenticated')
  }
  const lessons = await onboardingService.getAssessmentLessons(session.user.id)
  logger.log('lessons:', lessons)
  return lessons
}

export async function completeAssessmentLessonAction(lessonId: string, userResponse: string) {
  const onboardingService = createOnboardingService()
  const completedLesson = await onboardingService.completeAssessmentLesson(lessonId, userResponse)
  logger.log('completed lesson:', completedLesson)
  return completedLesson
}