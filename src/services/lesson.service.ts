import { LessonModel, LessonStep, OnboardingModel } from "@/models/AppAllModels.model"
import { ILessonGeneratorService, ILessonRepository, IOnboardingRepository } from "@/lib/interfaces/all-interfaces"

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
    return this.lessonRepository.getLessonById(lessonId)
  }

  async createLesson(lessonData: {
    focusArea: string
    targetSkills: string[]
    sequence: LessonStep[]
  }): Promise<LessonModel> {
    return this.lessonRepository.createLesson(lessonData)
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
    return this.lessonRepository.completeLesson(lessonId, performanceMetrics)
  }

  async deleteLesson(lessonId: string): Promise<void> {
    return this.lessonRepository.deleteLesson(lessonId)
  }

  async generateInitialLessons(userId: string): Promise<LessonModel[]> {
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
            sequence: lessonItem.sequence as LessonStep[]
          }
          return this.lessonRepository.createLesson(lessonData)
        })
      );
      
      return createdLessons;
    })
    
    // Flatten the nested array of lessons and return
    const lessonsNested = await Promise.all(lessonPromises);
    return lessonsNested.flat();
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