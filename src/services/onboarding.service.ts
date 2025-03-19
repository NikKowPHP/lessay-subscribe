import { OnboardingModel } from "@/domain/models/models"
import { onboardingRepository } from "../repositories/onboarding.repository"

export interface IOnboardingRepository {
  getOnboarding(): Promise<OnboardingModel | null>
  createOnboarding(): Promise<OnboardingModel>
  updateOnboarding(step: string): Promise<OnboardingModel>
  completeOnboarding(): Promise<OnboardingModel>
  deleteOnboarding(): Promise<void>
  getStatus(): Promise<boolean>
}



export default class OnboardingService implements IOnboardingRepository {
  private onboardingRepository: IOnboardingRepository
  constructor( onboardingRepository: IOnboardingRepository ) {
    this.onboardingRepository = onboardingRepository
 
  }

   getOnboarding = async (): Promise<OnboardingModel | null> => {
    return this.onboardingRepository.getOnboarding()
  }

  createOnboarding = async (): Promise<OnboardingModel> => {
    return this.onboardingRepository.createOnboarding()
  }

  updateOnboarding = async (step: string): Promise<OnboardingModel> => {
    return this.onboardingRepository.updateOnboarding(step)
  }

  completeOnboarding = async (): Promise<OnboardingModel> => {
    return this.onboardingRepository.completeOnboarding()
  }

  deleteOnboarding = async (): Promise<void> => {
    return this.onboardingRepository.deleteOnboarding()
  }
}
