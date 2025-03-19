'use server'
import OnboardingService from '@/services/onboarding.service'
import { OnboardingModel } from '@/models/AppAllModels.model'
import { OnboardingRepository } from '@/repositories/onboarding.repository'
import { SupabaseAuthService } from '@/services/supabase-auth.service'

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
