'use server'
import { OnboardingService } from '@/services/onboarding.service'
import { OnboardingModel } from '@/models/onboarding.model'

export async function createOnboardingAction() {
  return await onboardingService.createOnboarding()
}

export async function getOnboardingAction() {
  return await onboardingService.getOnboarding()
}

export async function updateOnboardingAction(step: string) {
  if (!step) {
    throw new Error('Step is required')
  }
  return await onboardingService.updateOnboarding(step)
}

export async function completeOnboardingAction() {
  return await onboardingService.completeOnboarding()
}

export async function deleteOnboardingAction() {
  return await onboardingService.deleteOnboarding()
}

export async function getStatusAction() {
  return await onboardingService.getStatus()
}