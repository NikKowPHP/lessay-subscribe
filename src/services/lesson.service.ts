import { LessonModel, LessonStep, OnboardingModel } from "@/models/AppAllModels.model"
import { ILessonGeneratorService, ILessonRepository, IOnboardingRepository } from "@/lib/interfaces/all-interfaces"
import logger from "@/utils/logger"

export default class LessonService implements ILessonRepository {
  private lessonRepository: ILessonRepository
  private lessonGeneratorService: ILessonGeneratorService
  private onboardingRepository: IOnboardingRepository

  constructor(
    lessonRepository: ILessonRepository, 
    lessonGeneratorService: ILessonGeneratorService,
    onboardingRepository: IOnboardingRepository
  ) {
    this.lessonRepository = lessonRepository
    this.lessonGeneratorService = lessonGeneratorService
    this.onboardingRepository = onboardingRepository
  }

  async getLessons(): Promise<LessonModel[]> {
    return this.lessonRepository.getLessons()
  }

  async getLessonById(lessonId: string): Promise<LessonModel | null> {
    const lesson = await this.lessonRepository.getLessonById(lessonId)
    if (lesson) {
        // Sort steps by stepNumber
        lesson.steps = lesson.steps.sort((a, b) => a.stepNumber - b.stepNumber)
    }
    logger.info('getLessonById', { lesson })
    return lesson
  }
  
  async createLesson(lessonData: {
    focusArea: string
    targetSkills: string[]
    steps: LessonStep[]
  }): Promise<LessonModel> {
    logger.info('Creating lesson', { 
      focusArea: lessonData.focusArea,
      targetSkills: lessonData.targetSkills,
      stepsLength: lessonData.steps.length
    });

    try {
      const createdLesson = await this.lessonRepository.createLesson(lessonData);
      logger.info('Lesson created successfully', { 
        lessonId: createdLesson.id,
        userId: createdLesson.userId
      });
      return createdLesson;
    } catch (error) {
      logger.error('Error creating lesson', { 
        error: (error as Error).message,
        lessonData: {
          focusArea: lessonData.focusArea,
          targetSkills: lessonData.targetSkills,
          stepsLength: lessonData.steps.length
        }
      });
      throw error;
    }
  }

  async updateLesson(lessonId: string, lessonData: Partial<LessonModel>): Promise<LessonModel> {
    return this.lessonRepository.updateLesson(lessonId, lessonData)
  }

  async completeLesson(
    lessonId: string,
    performanceMetrics?: {
      accuracy?: number
      pronunciationScore?: number
      errorPatterns?: string[]
    }
  ): Promise<LessonModel> {
    // todo: ai handle and give perfomance metrics
    // todo: create perfomance metrics. from attemts and so on 
    return this.lessonRepository.completeLesson(lessonId, performanceMetrics)
  }

  async deleteLesson(lessonId: string): Promise<void> {
    return this.lessonRepository.deleteLesson(lessonId)
  }

  async generateInitialLessons(): Promise<LessonModel[]> {
    // Get user onboarding data to extract learning preferences
    const onboardingData = await this.onboardingRepository.getOnboarding()
    
    if (!onboardingData) {
      throw new Error("Cannot generate lessons: User onboarding data not found")
    }
    
    // Extract necessary data for lesson generation
    const targetLanguage = onboardingData.targetLanguage || 'English'
    const proficiencyLevel = onboardingData.proficiencyLevel?.toLowerCase() || 'beginner'
    const learningPurpose = onboardingData.learningPurpose || 'general'
    
    // Define topics based on learning purpose
    const topics = this.getTopicsFromLearningPurpose(learningPurpose)
    
    // Generate lessons for each topic
    const lessonPromises = topics.map(async (topic) => {
      const generatedResult = await this.lessonGeneratorService.generateLesson(
        topic, 
        targetLanguage, 
        proficiencyLevel
      );
      const lessonItems = Array.isArray(generatedResult.data)
        ? generatedResult.data
        : [generatedResult.data];
      
      // For each lesson item, create a lesson record
      const createdLessons = await Promise.all(
        lessonItems.map((lessonItem: any) => {
          const lessonData = {
            focusArea: lessonItem.focusArea,
            targetSkills: lessonItem.targetSkills,
            steps: lessonItem.steps as LessonStep[]
          }
          return this.createLesson(lessonData)
        })
      );
      
      return createdLessons;
    })
    
    // Flatten the nested array of lessons and return
    const lessonsNested = await Promise.all(lessonPromises);
    return lessonsNested.flat();
  }

  async recordStepAttempt(lessonId: string, stepId: string, data: {
    userResponse: string
    correct: boolean
    errorPatterns?: string[]
  }): Promise<LessonStep> {
    return this.lessonRepository.recordStepAttempt(lessonId, stepId, data);
  }
  
  async getStepHistory(lessonId: string, stepId: string): Promise<LessonStep[]> {
    return this.lessonRepository.getStepHistory(lessonId, stepId);
  }

  
  private getTopicsFromLearningPurpose(purpose: string): string[] {
    // Map learning purposes to relevant topics
    const topicMap: Record<string, string[]> = {
      'travel': ['Airport Navigation', 'Hotel Booking', 'Restaurant Ordering'],
      'business': ['Business Meeting', 'Email Communication', 'Phone Conversations'],
      'academic': ['Classroom Vocabulary', 'Academic Writing', 'Study Discussions'],
      'general': ['Daily Greetings', 'Shopping', 'Directions'],
      // Add more purpose-to-topics mappings as needed
    }
    
    // Return topics for the given purpose, or default to general topics
    return topicMap[purpose.toLowerCase()] || topicMap['general']
  }
}