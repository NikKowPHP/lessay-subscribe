import {
  LessonModel,
  LessonStep,
  OnboardingModel,
} from '@/models/AppAllModels.model';
import {
  ILessonGeneratorService,
  ILessonRepository,
  IOnboardingRepository,
} from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';

export default class LessonService implements ILessonRepository {
  private lessonRepository: ILessonRepository;
  private lessonGeneratorService: ILessonGeneratorService;
  private onboardingRepository: IOnboardingRepository;

  constructor(
    lessonRepository: ILessonRepository,
    lessonGeneratorService: ILessonGeneratorService,
    onboardingRepository: IOnboardingRepository
  ) {
    this.lessonRepository = lessonRepository;
    this.lessonGeneratorService = lessonGeneratorService;
    this.onboardingRepository = onboardingRepository;
  }

  async getLessons(): Promise<LessonModel[]> {
    return this.lessonRepository.getLessons();
  }

  async getLessonById(lessonId: string): Promise<LessonModel | null> {
    const lesson = await this.lessonRepository.getLessonById(lessonId);
    if (lesson) {
      // Sort steps by stepNumber
      lesson.steps = lesson.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    }
    logger.info('getLessonById', { lesson });
    return lesson;
  }

  async createLesson(lessonData: {
    focusArea: string;
    targetSkills: string[];
    steps: LessonStep[];
  }): Promise<LessonModel> {
    logger.info('Creating lesson', {
      focusArea: lessonData.focusArea,
      targetSkills: lessonData.targetSkills,
      stepsLength: lessonData.steps.length,
    });

    try {
      const createdLesson = await this.lessonRepository.createLesson(
        lessonData
      );
      logger.info('Lesson created successfully', {
        lessonId: createdLesson.id,
        userId: createdLesson.userId,
      });
      return createdLesson;
    } catch (error) {
      logger.error('Error creating lesson', {
        error: (error as Error).message,
        lessonData: {
          focusArea: lessonData.focusArea,
          targetSkills: lessonData.targetSkills,
          stepsLength: lessonData.steps.length,
        },
      });
      throw error;
    }
  }

  async updateLesson(
    lessonId: string,
    lessonData: Partial<LessonModel>
  ): Promise<LessonModel> {
    return this.lessonRepository.updateLesson(lessonId, lessonData);
  }

  async completeLesson(
    lessonId: string,
    performanceMetrics?: {
      accuracy?: number;
      pronunciationScore?: number;
      errorPatterns?: string[];
    }
  ): Promise<LessonModel> {
    // TODO: Implement pronunciation check
    // TODO: Implement error pattern analysis
    // TODO: Implement accuracy calculation
    // TODO: Implement performance metrics calculation

    // Get the lesson with all steps to analyze performance
    const lesson = await this.getLessonById(lessonId);
    logger.info('completing lesson', { lesson });
    if (!lesson) {
      throw new Error(
        `Cannot complete lesson: Lesson with ID ${lessonId} not found`
      );
    }

    // If metrics were provided externally, use those
    if (performanceMetrics) {
      return this.lessonRepository.completeLesson(lessonId, performanceMetrics);
    }

    // Otherwise, calculate metrics based on lesson step data
    const steps = lesson.steps;
    logger.info(' steps in lesson completion', { steps });
    // Calculate accuracy (percentage of correct responses)
    const attemptedSteps = steps.filter((step) => step.attempts > 0);
    logger.info(' attemptedSteps in lesson completion', { attemptedSteps });
    const correctSteps = steps.filter((step) => step.correct);
    logger.info(' correctSteps in lesson completion', { correctSteps });
    const accuracy =
      attemptedSteps.length > 0
        ? Math.round((correctSteps.length / attemptedSteps.length) * 100)
        : 0;

    // Analyze error patterns (collect common errors)
    const allErrorPatterns = steps
      .filter(
        (step) =>
          Array.isArray(step.errorPatterns) && step.errorPatterns.length > 0
      )
      .flatMap((step) => step.errorPatterns);
    logger.info(' allErrorPatterns in lesson completion', { allErrorPatterns });
    // Count occurrences of each error pattern
    const errorPatternCount: Record<string, number> = {};
    allErrorPatterns.forEach((pattern) => {
      if (pattern) {
        errorPatternCount[pattern] = (errorPatternCount[pattern] || 0) + 1;
      }
    });
    logger.info(' errorPatternCount in lesson completion', {
      errorPatternCount,
    });
    // Get the top error patterns (most frequent errors)
    const topErrorPatterns = Object.entries(errorPatternCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
    logger.info(' topErrorPatterns in lesson completion', { topErrorPatterns });
    // Calculate a simple pronunciation score (for now based on accuracy)
    // In a real implementation, this would come from more sophisticated audio analysis
    const pronunciationScore = Math.min(
      100,
      Math.max(0, accuracy - 10 + Math.random() * 20)
    );

    const calculatedMetrics = {
      accuracy,
      pronunciationScore: Math.round(pronunciationScore),
      errorPatterns: topErrorPatterns,
    };
    logger.info(' calculatedMetrics in lesson completion', {
      calculatedMetrics,
    });
    logger.info('Completing lesson with calculated metrics', {
      lessonId,
      metrics: calculatedMetrics,
    });

    return this.lessonRepository.completeLesson(lessonId, calculatedMetrics);
  }

  async deleteLesson(lessonId: string): Promise<void> {
    return this.lessonRepository.deleteLesson(lessonId);
  }

  async generateInitialLessons(): Promise<LessonModel[]> {
    // Get user onboarding data to extract learning preferences
    const onboardingData = await this.onboardingRepository.getOnboarding();

    if (!onboardingData) {
      throw new Error(
        'Cannot generate lessons: User onboarding data not found'
      );
    }

    // Extract necessary data for lesson generation
    const targetLanguage = onboardingData.targetLanguage || 'English';
    const proficiencyLevel =
      onboardingData.proficiencyLevel?.toLowerCase() || 'beginner';
    const learningPurpose = onboardingData.learningPurpose || 'general';

    // Define topics based on learning purpose
    const topics = this.getTopicsFromLearningPurpose(learningPurpose);

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
            steps: lessonItem.steps as LessonStep[],
          };
          return this.createLesson(lessonData);
        })
      );

      return createdLessons;
    });

    // Flatten the nested array of lessons and return
    const lessonsNested = await Promise.all(lessonPromises);
    return lessonsNested.flat();
  }

  async recordStepAttempt(
    lessonId: string,
    stepId: string,
    data: {
      userResponse: string;
      correct: boolean;
      errorPatterns?: string[];
    }
  ): Promise<LessonStep> {
    return this.lessonRepository.recordStepAttempt(lessonId, stepId, data);
  }

  async getStepHistory(
    lessonId: string,
    stepId: string
  ): Promise<LessonStep[]> {
    return this.lessonRepository.getStepHistory(lessonId, stepId);
  }

  private getTopicsFromLearningPurpose(purpose: string): string[] {
    // Map learning purposes to relevant topics
    const topicMap: Record<string, string[]> = {
      travel: ['Airport Navigation', 'Hotel Booking', 'Restaurant Ordering'],
      business: [
        'Business Meeting',
        'Email Communication',
        'Phone Conversations',
      ],
      academic: [
        'Classroom Vocabulary',
        'Academic Writing',
        'Study Discussions',
      ],
      general: ['Daily Greetings', 'Shopping', 'Directions'],
      // Add more purpose-to-topics mappings as needed
    };

    // Return topics for the given purpose, or default to general topics
    return topicMap[purpose.toLowerCase()] || topicMap['general'];
  }
}
