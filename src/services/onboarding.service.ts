import { OnboardingModel, AssessmentLesson } from "@/models/AppAllModels.model"
import { IOnboardingRepository } from "@/lib/interfaces/all-interfaces"
import logger from "@/utils/logger"
import LessonService from "./lesson.service"


export default class OnboardingService implements IOnboardingRepository {
  private onboardingRepository: IOnboardingRepository
  private lessonService: LessonService
  constructor(  onboardingRepository: IOnboardingRepository, lessonService: LessonService ) {
    this.onboardingRepository = onboardingRepository
    this.lessonService = lessonService
  }

   getOnboarding = async (): Promise<OnboardingModel | null> => {
    const onboarding = await this.onboardingRepository.getOnboarding()
    logger.info('Onboarding:', onboarding)
    return onboarding
  }

  createOnboarding = async (): Promise<OnboardingModel> => {
    return this.onboardingRepository.createOnboarding()
  }

  updateOnboarding = async (step: string): Promise<OnboardingModel> => {
    return this.onboardingRepository.updateOnboarding(step)
  }

  completeOnboarding = async (): Promise<OnboardingModel> => {
    const onboarding = await this.onboardingRepository.completeOnboarding()
    await this.lessonService.generateInitialLessons()
    return onboarding
  }

  deleteOnboarding = async (): Promise<void> => {
    return this.onboardingRepository.deleteOnboarding()
  }

  getStatus = async (): Promise<boolean> => {
    return this.onboardingRepository.getStatus()
  }

  async getAssessmentLessons(userId: string): Promise<AssessmentLesson[]> {
    return this.onboardingRepository.getAssessmentLessons(userId)
  }

  async completeAssessmentLesson(lessonId: string, userResponse: string): Promise<AssessmentLesson> {

    return this.onboardingRepository.completeAssessmentLesson(lessonId, userResponse)
  }
}
