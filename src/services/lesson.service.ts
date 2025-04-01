import {
  AudioMetrics,
  getExerciseCompletion,
  getFluencyAssessment,
  getGrammarAssessment,
  getPronunciationAssessment,
  getVocabularyAssessment,
  LessonModel,
  LessonStep,
  OnboardingModel,
} from '@/models/AppAllModels.model';
import {
  ILessonRepository,
  IOnboardingRepository,
} from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import { ILessonGeneratorService } from './lesson-generator.service';
import RecordingService from './recording.service';

import { JsonValue } from '@prisma/client/runtime/library';
import { mockAudioMetrics } from '@/__mocks__/generated-audio-metrics.mock';
import { ComprehensionLevel, HesitationFrequency, LanguageInfluenceLevel, LearningTrajectory, SpeechRateEvaluation, VocabularyRange } from '@prisma/client';

export default class LessonService {
  private lessonRepository: ILessonRepository;
  private lessonGeneratorService: ILessonGeneratorService;
  private onboardingRepository: IOnboardingRepository;
  private recordingService: RecordingService;

  constructor(
    lessonRepository: ILessonRepository,
    lessonGeneratorService: ILessonGeneratorService,
    onboardingRepository: IOnboardingRepository
  ) {
    this.lessonRepository = lessonRepository;
    this.lessonGeneratorService = lessonGeneratorService;
    this.onboardingRepository = onboardingRepository;
    this.recordingService = new RecordingService();
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
        steps: createdLesson.steps,
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
    const targetLanguage = onboardingData.targetLanguage || 'German';
    const proficiencyLevel =
      onboardingData.proficiencyLevel?.toLowerCase() || 'beginner';
    const learningPurpose = onboardingData.learningPurpose || 'general';
    const sourceLanguage = onboardingData.nativeLanguage || 'English';
    // Define topics based on learning purpose
    const topics = this.getTopicsFromLearningPurpose(learningPurpose);

    // Generate lessons for each topic
    const lessonPromises = topics.map(async (topic) => {
      const generatedResult = await this.lessonGeneratorService.generateLesson(
        topic,
        targetLanguage,
        proficiencyLevel,
        sourceLanguage
      );
      const lessonItems = Array.isArray(generatedResult.data)
        ? generatedResult.data
        : [generatedResult.data];

      // For each lesson item, create a lesson record
      const createdLessons = await Promise.all(
        lessonItems.map(async (lessonItem: any) => {
          const audioSteps =
            await this.lessonGeneratorService.generateAudioForSteps(
              lessonItem.steps as LessonStep[],
              targetLanguage,
              sourceLanguage
            );

          // TODO: Seperate into 2 promises, one will be sent to user to update the loading screen while fetching the audio .
          const lessonData = {
            focusArea: lessonItem.focusArea,
            targetSkills: lessonItem.targetSkills,
            steps: audioSteps,
          };
          logger.info(
            'lessonData in initial lesson generation  with steps: ',
            { lessonData },
            { steps: lessonData.steps }
          );
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
      step.type !== 'feedback'
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
      case 'feedback':
      case 'instruction':
      case 'summary':
        correct = true;
        userResponse = userResponse || 'Acknowledged';
        break;

      case 'practice':
      case 'prompt':
      case 'new_word':
        if (step.expectedAnswer) {
          logger.info('step.expectedAnswer', step.expectedAnswer);
          logger.info('userResponse', userResponse);
          
          // Normalize user response by removing punctuation and special characters
          const normalizedUserResponse = userResponse
            .trim()
            .toLowerCase()
            // Remove punctuation, ellipses, and extra whitespace
            .replace(/[.,!?;:"'""''()[\]…]+/g, '')
            .replace(/\s+/g, ' ');
          
          // Normalize expected answer the same way
          const normalizedExpectedAnswer = step.expectedAnswer
            .trim()
            .toLowerCase()
            // Remove punctuation, ellipses, and extra whitespace
            .replace(/[.,!?;:"'""''()[\]…]+/g, '')
            .replace(/\s+/g, ' ');
            
          // Main comparison: Check if normalized user response includes
          // the essential part of the normalized expected answer
          
          // First check if expected answer without ellipses is in user response
          const essentialExpectedPart = normalizedExpectedAnswer.replace(/\.{3,}/g, '').trim();
          
          logger.info('Normalized user response:', normalizedUserResponse);
          logger.info('Essential expected part:', essentialExpectedPart);
          
          // Check if either there's a very close match, or the user response
          // contains the essential part of the expected answer
          if (normalizedUserResponse === essentialExpectedPart) {
            correct = true;
          } else if (normalizedUserResponse.includes(essentialExpectedPart)) {
            correct = true;
          } else if (essentialExpectedPart.includes(normalizedUserResponse)) {
            // For responses that may be shorter but still valid
            // For example, if expected is "hallo ich heiße" and user just said "hallo"
            const essentialWords = essentialExpectedPart.split(' ');
            const userWords = normalizedUserResponse.split(' ');
            
            // If user said at least half of the essential words, consider it correct
            // This helps with partial responses that are still meaningful
            const matchedWordCount = userWords.filter(word => 
              essentialWords.includes(word) && word.length > 1
            ).length;
            
            correct = matchedWordCount / essentialWords.length >= 0.5;
          }
        } else {
          // If no expected answer, consider it correct (open-ended question)
          correct = true;
        }
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
    const sourceLanguage = onboardingData.nativeLanguage || 'English';

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
        proficiencyLevel,
        sourceLanguage
      );

      const lessonItems = Array.isArray(generatedResult.data)
        ? generatedResult.data
        : [generatedResult.data];

      // Create lessons from generated content
      const createdLessons = await Promise.all(
        lessonItems.map(async (lessonItem: any) => {
          const audioSteps =
            await this.lessonGeneratorService.generateAudioForSteps(
              lessonItem.steps as LessonStep[],
              targetLanguage,
              sourceLanguage
            );
          logger.info('generating audio for  LESSON steps', { audioSteps });
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

  async processLessonRecording(
    sessionRecording: Blob,
    recordingTime: number,
    recordingSize: number,
    lesson: LessonModel
  ) {
    //1. get user onboarding data with lagnuages
    const onboardingData = await this.onboardingRepository.getOnboarding();
    if (!onboardingData) {
      throw new Error('User onboarding data not found');
    }
    const targetLanguage = onboardingData.targetLanguage || 'English';
    const sourceLanguage = onboardingData.nativeLanguage || 'English';


    // 2. process recording
    const arrayBuffer = await sessionRecording.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileUri = await this.recordingService.uploadFile(
      buffer,
      sessionRecording.type,
      `lesson-${lesson.id}-${Date.now()}.webm`
    );
    logger.log('File URI:', fileUri);

    // send recording to AI
    let aiResponse :Record<string, unknown>;
    if (process.env.MOCK_AI_RESPONSE === 'true') {
      aiResponse = mockAudioMetrics;
    } else {
      aiResponse = await this.recordingService.submitLessonRecordingSession(
        fileUri, // Now using file URI instead of base64
        Number(recordingTime),
        Number(recordingSize),
        { targetLanguage, nativeLanguage: sourceLanguage },
        lesson
      );
    }

    // 3. convert ai  response to audioMetrics model. 
    const audioMetrics = this.convertAiResponseToAudioMetrics(aiResponse)

    // 4. update lesson with sessionRecordingMetrics, lesson should have a foreign key to audioMetrics
    // TODO: Check repo if everything is ok
    return this.lessonRepository.updateLesson(lesson.id, { audioMetrics })
  }

  private convertAiResponseToAudioMetrics(aiResponse: Record<string, unknown>): AudioMetrics {
    // Extract top-level metrics with defaults if not present
    const pronunciationScore = typeof aiResponse.pronunciationScore === 'number' 
      ? aiResponse.pronunciationScore : 0;
    const fluencyScore = typeof aiResponse.fluencyScore === 'number' 
      ? aiResponse.fluencyScore : 0;
    const grammarScore = typeof aiResponse.grammarScore === 'number' 
      ? aiResponse.grammarScore : 0;
    const vocabularyScore = typeof aiResponse.vocabularyScore === 'number' 
      ? aiResponse.vocabularyScore : 0;
    const overallPerformance = typeof aiResponse.overallPerformance === 'number' 
      ? aiResponse.overallPerformance : 0;
    
    // Generate a unique ID for the metrics
    const id = crypto.randomUUID();
    
    // Extract CEFR level and learning trajectory
    const proficiencyLevel = typeof aiResponse.proficiencyLevel === 'string' 
      ? aiResponse.proficiencyLevel : 'A1';
    
    // Safely convert learning trajectory to enum value
    let learningTrajectory: LearningTrajectory = 'steady';
    if (aiResponse.learningTrajectory === 'accelerating') {
      learningTrajectory = 'accelerating';
    } else if (aiResponse.learningTrajectory === 'plateauing') {
      learningTrajectory = 'plateauing';
    }
    
    // Extract detailed assessment data using our type guard helpers
    const pronunciationAssessment = getPronunciationAssessment(
      aiResponse.pronunciationAssessment as JsonValue
    ) || {
      overall_score: pronunciationScore,
      native_language_influence: {
        level: 'moderate' as LanguageInfluenceLevel,
        specific_features: []
      },
      phoneme_analysis: [],
      problematic_sounds: [],
      strengths: [],
      areas_for_improvement: []
    };
    
    const fluencyAssessment = getFluencyAssessment(
      aiResponse.fluencyAssessment as JsonValue
    ) || {
      overall_score: fluencyScore,
      speech_rate: {
        words_per_minute: 0,
        evaluation: 'appropriate' as SpeechRateEvaluation
      },
      hesitation_patterns: {
        frequency: 'occasional' as HesitationFrequency,
        average_pause_duration: 0,
        typical_contexts: []
      },
      rhythm_and_intonation: {
        naturalness: 0,
        sentence_stress_accuracy: 0,
        intonation_pattern_accuracy: 0
      }
    };
    
    const grammarAssessment = getGrammarAssessment(
      aiResponse.grammarAssessment as JsonValue
    ) || {
      overall_score: grammarScore,
      error_patterns: [],
      grammar_rules_to_review: [],
      grammar_strengths: []
    };
    
    const vocabularyAssessment = getVocabularyAssessment(
      aiResponse.vocabularyAssessment as JsonValue
    ) || {
      overall_score: vocabularyScore,
      range: 'adequate' as VocabularyRange,
      appropriateness: 0,
      precision: 0,
      areas_for_expansion: []
    };
    
    const exerciseCompletion = getExerciseCompletion(
      aiResponse.exerciseCompletion as JsonValue
    ) || {
      overall_score: 0,
      exercises_analyzed: [],
      comprehension_level: 'fair' as ComprehensionLevel
    };
    
    // Extract string arrays safely
    const extractStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter(item => typeof item === 'string') as string[];
      }
      return [];
    };
    
    const suggestedTopics = extractStringArray(aiResponse.suggestedTopics);
    const grammarFocusAreas = extractStringArray(aiResponse.grammarFocusAreas);
    const vocabularyDomains = extractStringArray(aiResponse.vocabularyDomains);
    const nextSkillTargets = extractStringArray(aiResponse.nextSkillTargets);
    const preferredPatterns = extractStringArray(aiResponse.preferredPatterns);
    const effectiveApproaches = extractStringArray(aiResponse.effectiveApproaches);
    
    // Extract metadata
    const audioRecordingUrl = typeof aiResponse.audioRecordingUrl === 'string' 
      ? aiResponse.audioRecordingUrl : null;
    const recordingDuration = typeof aiResponse.recordingDuration === 'number' 
      ? aiResponse.recordingDuration : null;
    
    // Construct and return the AudioMetrics object
    return {
      id,
      pronunciationScore,
      fluencyScore,
      grammarScore,
      vocabularyScore,
      overallPerformance,
      proficiencyLevel,
      learningTrajectory,
      pronunciationAssessment,
      fluencyAssessment,
      grammarAssessment,
      vocabularyAssessment,
      exerciseCompletion,
      suggestedTopics,
      grammarFocusAreas,
      vocabularyDomains,
      nextSkillTargets,
      preferredPatterns,
      effectiveApproaches,
      audioRecordingUrl,
      recordingDuration,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

}
