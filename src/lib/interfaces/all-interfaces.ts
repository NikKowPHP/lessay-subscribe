import { AssessmentLesson, OnboardingModel } from "@/models/AppAllModels.model"

export default interface IOnboardingRepository {
  getOnboarding(): Promise<OnboardingModel | null>
  createOnboarding(): Promise<OnboardingModel>
  updateOnboarding(step: string): Promise<OnboardingModel>
  completeOnboarding(): Promise<OnboardingModel>
  deleteOnboarding(): Promise<void>
  getStatus(): Promise<boolean>
  getAssessmentLessons(userId: string): Promise<AssessmentLesson[]>
  completeAssessmentLesson(lessonId: string, userResponse: string): Promise<AssessmentLesson>
}
