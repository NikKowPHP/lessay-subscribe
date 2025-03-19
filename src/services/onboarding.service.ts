import { OnboardingModel } from "@/domain/models/models" // todo: create model
import IOnboardingRepository from "@/lib/interfaces/all-interfaces"




export default class OnboardingService implements IOnboardingRepository {
  private onboardingRepository: IOnboardingRepository
  constructor(  onboardingRepository: IOnboardingRepository ) {
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

  getStatus = async (): Promise<boolean> => {
    return this.onboardingRepository.getStatus()
  }
}
