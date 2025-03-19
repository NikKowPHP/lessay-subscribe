export default interface IOnboardingRepository {
  getOnboarding(): Promise<OnboardingModel | null>
  createOnboarding(): Promise<OnboardingModel>
  updateOnboarding(step: string): Promise<OnboardingModel>
  completeOnboarding(): Promise<OnboardingModel>
  deleteOnboarding(): Promise<void>
  getStatus(): Promise<boolean>
}
