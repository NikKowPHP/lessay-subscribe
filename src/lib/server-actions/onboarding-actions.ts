'use server'
import OnboardingService from '@/services/onboarding.service'
import { OnboardingRepository } from '@/repositories/onboarding.repository'
import { SupabaseAuthService } from '@/services/supabase-auth.service'
import { getSession } from '@/repositories/supabase/supabase'

function createOnboardingService() {
  const repository = new OnboardingRepository(new SupabaseAuthService())
  return new OnboardingService(repository)
}


export async function createOnboardingAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.createOnboarding()
}

export async function getOnboardingAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.getOnboarding()
}

export async function updateOnboardingAction(step: string) {
  if (!step) {
    throw new Error('Step is required')
  }
  const onboardingService = createOnboardingService()
  return await onboardingService.updateOnboarding(step)
}

export async function completeOnboardingAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.completeOnboarding()
}

export async function deleteOnboardingAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.deleteOnboarding()
}

export async function getStatusAction() {
  const onboardingService = createOnboardingService()
  return await onboardingService.getStatus()
}

export async function getAssessmentLessonsAction() {
  const onboardingService = createOnboardingService()
  const session = await getSession()
  if (!session) {
    throw new Error('User not authenticated')
  }
  return await onboardingService.getAssessmentLessons(session.user.id)
}

export async function completeAssessmentLessonAction(lessonId: string, userResponse: string) {
  const onboardingService = createOnboardingService()
  return await onboardingService.completeAssessmentLesson(lessonId, userResponse)
}
