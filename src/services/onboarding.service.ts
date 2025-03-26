import { OnboardingModel, AssessmentLesson } from "@/models/AppAllModels.model"
import {  IOnboardingRepository } from "@/lib/interfaces/all-interfaces"
import logger from "@/utils/logger"
import LessonService from "./lesson.service"
import LessonGeneratorService from "./lesson-generator.service"
import { IAssessmentGeneratorService } from "./assessment-step-generator.service"


export default class OnboardingService {
  private onboardingRepository: IOnboardingRepository
  private lessonService: LessonService
  private assessmentGeneratorService: IAssessmentGeneratorService
  constructor(  onboardingRepository: IOnboardingRepository, lessonService: LessonService, assessmentGeneratorService: IAssessmentGeneratorService ) {
    this.onboardingRepository = onboardingRepository
    this.lessonService = lessonService
    this.assessmentGeneratorService = assessmentGeneratorService
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

  async getAssessmentLesson(userId: string): Promise<AssessmentLesson> {
    try {
      // First check if there's already an assessment lesson
      const existingAssessment = await this.onboardingRepository.getAssessmentLesson(userId)
      if (existingAssessment) {
        return existingAssessment
      }
      
      // Get onboarding data to get language preferences
      const onboarding = await this.onboardingRepository.getOnboarding()
      
      // Generate assessment steps
      const steps = await this.assessmentGeneratorService.generateAssessmentSteps(
        onboarding?.targetLanguage || "German",
        onboarding?.nativeLanguage || "English",
        onboarding?.proficiencyLevel || "beginner"
      )
      
      logger.info(`Generated ${(steps)} assessment steps`)
      
      // Construct complete assessment lesson object
      const assessmentLesson = {
        userId,
        description: `Comprehensive ${onboarding?.targetLanguage || "German"} language assessment`,
        completed: false,
        sourceLanguage: onboarding?.nativeLanguage || "English",
        targetLanguage: onboarding?.targetLanguage || "German",
        metrics: { //TODO: will be generated after completion of onboarding
          accuracy: 0,
          pronunciationScore: 0,
          grammarScore: 0,
          vocabularyScore: 0,
          overallScore: 0,
          strengths: [],
          weaknesses: []
        },
        proposedTopics: [], //TODO: will be generated after completion of onboarding
        summary: null, //TODO: will be generated after completion of onboarding
        steps: steps
      }
      
      logger.info(`Assessment lesson: ${JSON.stringify(assessmentLesson)}`)
      // Save to database
      return this.onboardingRepository.createAssessmentLesson(userId, assessmentLesson)
    } catch (error) {
      logger.error('Error generating assessment lesson:', error)
      throw new Error('Failed to generate assessment lesson')
    }
  }

  async completeAssessmentLesson(lessonId: string, userResponse: string): Promise<AssessmentLesson> {
    // get assessment lesson
    const assessmentLesson = await this.onboardingRepository.getAssessmentLesson(lessonId)
    if (!assessmentLesson) {
      throw new Error('Assessment lesson not found')
    }

    const results = this.assessmentGeneratorService.generateResults(assessmentLesson, userResponse)

    assessmentLesson.metrics = results.metrics
    assessmentLesson.summary = results.summary
    assessmentLesson.proposedTopics = results.proposedTopics

    // complete assessment lesson
    return await this.onboardingRepository.completeAssessmentLesson(assessmentLesson, userResponse)

  }
}
