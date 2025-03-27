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

export default class LessonService {
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
        lessonItems.map(async (lessonItem: any) => {
          const audioSteps = await this.lessonGeneratorService.generateAudioForSteps(lessonItem.steps as LessonStep[], targetLanguage);
          // TODO: Seperate into 2 promises, one will be sent to user to update the loading screen while fetching the audio . 
          const lessonData = {
            focusArea: lessonItem.focusArea,
            targetSkills: lessonItem.targetSkills,
            steps: audioSteps,
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
    userResponse: string
  ): Promise<LessonStep> {
    const lesson = await this.getLessonById(lessonId);
    if (!lesson) {
      throw new Error('Assessment lesson not found');
    }
    const step = lesson?.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    // Validate user response for most step types
    if (
      step.type !== 'instruction' &&
      step.type !== 'summary' &&
      step.type !== 'model_answer'
    ) {
      if (!userResponse) {
        throw new Error('No response provided');
      }
      if (userResponse.length < 3) {
        throw new Error('Response is too short');
      }
      if (!step.expectedAnswer) {
        throw new Error('Expected answer not found');
      }
    }
    let correct = false;
    switch (step.type) {
      case 'model_answer':
      case 'instruction':
      case 'summary':
      case 'user_answer':
        correct = true;
        userResponse = userResponse || 'Acknowledged';
        break;

      case 'practice':
      case 'prompt':
      case 'new_word':
        // For practice steps, compare with the content directly
        correct =
          userResponse.trim().toLowerCase() ===
          step.expectedAnswer!.trim().toLowerCase();
        break;

      default:
        correct = false;
    }
    return this.lessonRepository.recordStepAttempt(lessonId, stepId, {
      userResponse,
      correct,
    });
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

  async generateNewLessonsBasedOnProgress(): Promise<LessonModel[]> {
    // Get all completed lessons to analyze performance
    const allLessons = await this.getLessons();
    const completedLessons = allLessons.filter((lesson) => lesson.completed);

    if (completedLessons.length === 0) {
      throw new Error('No completed lessons found to analyze');
    }

    // Get user onboarding data for base preferences
    const onboardingData = await this.onboardingRepository.getOnboarding();

    if (!onboardingData) {
      throw new Error('User onboarding data not found');
    }

    // Extract base preferences
    const targetLanguage = onboardingData.targetLanguage || 'English';
    const proficiencyLevel =
      onboardingData.proficiencyLevel?.toLowerCase() || 'beginner';

    // Aggregate performance metrics from completed lessons
    const errorPatterns = this.aggregateErrorPatterns(completedLessons);
    const avgAccuracy = this.calculateAverageAccuracy(completedLessons);

    // Determine focus areas based on performance
    const focusAreas = this.determineFocusAreas(
      errorPatterns,
      avgAccuracy,
      proficiencyLevel
    );

    // Generate new lessons for each focus area
    const lessonPromises = focusAreas.map(async (topic) => {
      const generatedResult = await this.lessonGeneratorService.generateLesson(
        topic,
        targetLanguage,
        proficiencyLevel
      );

      const lessonItems = Array.isArray(generatedResult.data)
        ? generatedResult.data
        : [generatedResult.data];

      // Create lessons from generated content
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

    // Flatten and return all new lessons
    const lessonsNested = await Promise.all(lessonPromises);
    return lessonsNested.flat();
  }

  // Helper methods for analyzing performance and determining new focus areas

  private aggregateErrorPatterns(completedLessons: LessonModel[]): string[] {
    // Collect all error patterns from completed lessons
    const allErrorPatterns: string[] = [];

    completedLessons.forEach((lesson) => {
      if (
        lesson.performanceMetrics &&
        typeof lesson.performanceMetrics === 'object' &&
        !Array.isArray(lesson.performanceMetrics) &&
        'errorPatterns' in lesson.performanceMetrics &&
        Array.isArray(lesson.performanceMetrics.errorPatterns)
      ) {
        allErrorPatterns.push(
          ...(lesson.performanceMetrics.errorPatterns as string[])
        );
      }
    });

    // Count occurrences
    const patternCount: Record<string, number> = {};
    allErrorPatterns.forEach((pattern) => {
      if (pattern) {
        patternCount[pattern] = (patternCount[pattern] || 0) + 1;
      }
    });

    // Return top patterns sorted by frequency
    return Object.entries(patternCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private calculateAverageAccuracy(completedLessons: LessonModel[]): number {
    const accuracies: number[] = [];

    completedLessons.forEach((lesson) => {
      if (
        lesson.performanceMetrics &&
        typeof lesson.performanceMetrics === 'object' &&
        !Array.isArray(lesson.performanceMetrics) &&
        'accuracy' in lesson.performanceMetrics &&
        typeof lesson.performanceMetrics.accuracy === 'number'
      ) {
        accuracies.push(lesson.performanceMetrics.accuracy);
      }
    });

    if (accuracies.length === 0) return 0;

    return Math.round(
      accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
    );
  }

  private determineFocusAreas(
    errorPatterns: string[],
    avgAccuracy: number,
    proficiencyLevel: string
  ): string[] {
    // Map error patterns to appropriate topics
    const topicsFromErrors = errorPatterns.map((pattern) => {
      // Map common error patterns to specific topics
      // This is a simplified example - in a real app, you'd have more sophisticated mapping
      if (pattern.includes('pronunciation')) return 'Pronunciation Practice';
      if (pattern.includes('grammar')) return 'Grammar Rules';
      if (pattern.includes('vocabulary')) return 'Vocabulary Building';
      return 'General Practice';
    });

    // Add topics based on accuracy and proficiency
    if (avgAccuracy < 50) {
      // If accuracy is low, focus on fundamentals
      // TODO: change to more dynamic
      topicsFromErrors.push('Vocabulary Building');
    } else if (avgAccuracy > 80 && proficiencyLevel === 'beginner') {
      // If doing well as a beginner, add slightly more advanced topics
      topicsFromErrors.push('General Practice');
    }

    // Remove duplicates and limit to 3 topics
    return [...new Set(topicsFromErrors)].slice(0, 3);
  }
}
