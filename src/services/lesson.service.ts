import {
  AudioMetrics,
  getExerciseCompletion,
  getFluencyAssessment,
  getGrammarAssessment,
  getPronunciationAssessment,
  getVocabularyAssessment,
  LearningProgressModel,
  LessonModel,
  LessonStep,
  OnboardingModel,
  isPerformanceMetrics,
  AssessmentLesson,
  AdaptiveLessonGenerationRequest,
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
import {
  ComprehensionLevel,
  HesitationFrequency,
  LanguageInfluenceLevel,
  LearningTrajectory,
  SpeechRateEvaluation,
  VocabularyRange,
  MasteryLevel,
} from '@prisma/client';
import LearningProgressService from './learning-progress.service';
import { LearningProgressRepository } from '@/repositories/learning-progress.repository';

import { randomUUID } from 'crypto';

interface LessonGenerationConfig {
  defaultLanguage: string;
  defaultProficiency: string;
  defaultPurpose: string;
}

// interface AdaptiveRequest {
//   completedAssessment: boolean;
//   audioMetricsAvailable: boolean;
//   metrics: any;
//   audioMetrics?: AudioMetricsPayload;
//   proposedTopics: string[];
//   summary: string;
// }

interface AudioMetricsPayload {
  pronunciationScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  overallPerformance: number;
  problematicSounds: string[];
  grammarRulesToReview: string[];
  vocabularyAreasForExpansion: string[];
  suggestedTopics: string[];
  proficiencyLevel: string;
}

export default class LessonService {
  private lessonRepository: ILessonRepository;
  private lessonGeneratorService: ILessonGeneratorService;
  private onboardingRepository: IOnboardingRepository;
  private recordingService: RecordingService;

  private learningProgressService: LearningProgressService;

  // Add class-level configuration constant
  private readonly lessonConfig: LessonGenerationConfig = {
    defaultLanguage: 'German',
    defaultProficiency: 'beginner',
    defaultPurpose: 'general',
  };

  constructor(
    lessonRepository: ILessonRepository,
    lessonGeneratorService: ILessonGeneratorService,
    onboardingRepository: IOnboardingRepository
  ) {
    this.lessonRepository = lessonRepository;
    this.lessonGeneratorService = lessonGeneratorService;
    this.onboardingRepository = onboardingRepository;
    this.recordingService = new RecordingService();
    const progressRepository = new LearningProgressRepository();
    this.learningProgressService = new LearningProgressService(
      progressRepository
    ); // Instantiate it here
  }

  async getLessons(): Promise<LessonModel[]> {
    const lessons = await this.lessonRepository.getLessons();
    if (!lessons || lessons.length === 0) {
      logger.info('No lessons found, checking the onboarding data');
      // get onboarding data
      const onboardingData = await this.onboardingRepository.getOnboarding();
      if (onboardingData && onboardingData.initialAssessmentCompleted) {
        logger.info('Initial assessment completed, generating lessons');
        // Call the method directly, don't return here as it might be called from checkAndGenerateNewLessons context indirectly
        return await this.generateInitialLessons();
      } else {
        // Throw specific error if assessment isn't done, but onboarding exists
        logger.warn('Initial assessment not completed, cannot proceed.');
        throw new Error('Initial assessment not completed');
      }
    }
    return lessons;
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

    try {
      // Collect all user responses from the steps
      const userResponses = lesson.steps
        .filter((step) => step.attempts > 0)
        .map((step) => {
          // Get responses from history if available, otherwise use single response
          const responseHistory = step.userResponseHistory
            ? (JSON.parse(step.userResponseHistory as string) as string[])
            : [];

          // Use the most recent response (either from history or the single field)
          const latestResponse =
            responseHistory.length > 0
              ? responseHistory[responseHistory.length - 1]
              : step.userResponse || '';

          return {
            stepId: step.id,
            response: latestResponse,
            // Optionally include full history if needed by analysis
            allResponses:
              responseHistory.length > 0
                ? responseHistory
                : step.userResponse
                ? [step.userResponse]
                : [],
          };
        });

      logger.info('Collected user responses for analysis', {
        responseCount: userResponses.length,
      });

      // Generate comprehensive lesson analysis using the LessonGeneratorService
      const completionResults =
        await this.lessonGeneratorService.generateLessonCompletionResults(
          lesson,
          userResponses
        );

      logger.info('Lesson completion analysis generated', {
        completionResults,
      });

      // Prepare comprehensive metrics for saving
      const fullMetrics = {
        accuracy: completionResults.metrics.accuracy,
        pronunciationScore: completionResults.metrics.pronunciationScore,
        grammarScore: completionResults.metrics.grammarScore,
        vocabularyScore: completionResults.metrics.vocabularyScore,
        overallScore: completionResults.metrics.overallScore,
        strengths: completionResults.metrics.strengths,
        weaknesses: completionResults.metrics.weaknesses,
        summary: completionResults.summary,
        nextLessonSuggestions: completionResults.nextLessonSuggestions,
      };

      // Update the lesson repository with comprehensive metrics
      const completedLesson = await this.lessonRepository.completeLesson(
        lessonId,
        fullMetrics
      );

      this.learningProgressService
        .updateProgressAfterLesson(completedLesson.userId, completedLesson)
        .catch((err) => {
          logger.error(
            'Failed to update learning progress after lesson completion',
            {
              userId: completedLesson.userId,
              lessonId: completedLesson.id,
              error: err,
            }
          );
          // Decide if this failure needs further handling
        });

      return completedLesson;
    } catch (error) {
      logger.error('Error completing lesson with AI analysis', { error });

      // Fallback to basic metrics calculation if AI analysis fails
      const steps = lesson.steps;
      const attemptedSteps = steps.filter((step) => step.attempts > 0);
      const correctSteps = steps.filter((step) => step.correct);

      const accuracy =
        attemptedSteps.length > 0
          ? Math.round((correctSteps.length / attemptedSteps.length) * 100)
          : 0;

      // Calculate a simple pronunciation score
      const pronunciationScore = Math.min(
        100,
        Math.max(0, accuracy - 10 + Math.random() * 20)
      );

      // Basic fallback metrics
      const fallbackMetrics = {
        accuracy,
        pronunciationScore: Math.round(pronunciationScore),
        errorPatterns: [], // No detailed error patterns in fallback mode
        grammarScore: Math.round(accuracy * 0.9),
        vocabularyScore: Math.round(accuracy * 0.95),
        overallScore: accuracy,
        strengths: [],
        weaknesses: [],
        summary: 'Lesson completed successfully.',
        nextLessonSuggestions: [],
      };

      logger.info('Using fallback metrics for lesson completion', {
        fallbackMetrics,
      });

      return this.lessonRepository.completeLesson(lessonId, fallbackMetrics);
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    return this.lessonRepository.deleteLesson(lessonId);
  }

  private constructAdaptiveRequest(assessment: AssessmentLesson): any {
    if (!assessment) {
      return undefined;
    }

    if (!assessment.audioMetrics) {
      return {
        completedAssessment: true,
        audioMetricsAvailable: false,
        metrics: assessment.metrics,
        proposedTopics: assessment.proposedTopics || [],
        summary: assessment.summary || '',
      };
    }

    const audioMetrics = assessment.audioMetrics;
    return {
      completedAssessment: true,
      audioMetricsAvailable: true,
      metrics: assessment.metrics,
      audioMetrics: {
        pronunciationScore: audioMetrics.pronunciationScore,
        fluencyScore: audioMetrics.fluencyScore,
        grammarScore: audioMetrics.grammarScore,
        vocabularyScore: audioMetrics.vocabularyScore,
        overallPerformance: audioMetrics.overallPerformance,
        problematicSounds:
          audioMetrics.pronunciationAssessment.problematic_sounds,
        grammarRulesToReview:
          audioMetrics.grammarAssessment.grammar_rules_to_review,
        vocabularyAreasForExpansion:
          audioMetrics.vocabularyAssessment.areas_for_expansion,
        suggestedTopics: audioMetrics.suggestedTopics,
        proficiencyLevel: audioMetrics.proficiencyLevel,
      },
      proposedTopics: assessment.proposedTopics || [],
      summary: assessment.summary || '',
    };
  }

  private async validateAssessmentData(): Promise<{
    onboardingData: OnboardingModel;
    assessment: AssessmentLesson;
  }> {
    const onboardingData = await this.onboardingRepository.getOnboarding();
    if (!onboardingData) {
      throw new Error('User onboarding data not found');
    }

    if (!onboardingData.initialAssessmentCompleted) {
      throw new Error('Initial assessment not completed');
    }

    const assessment = await this.onboardingRepository.getAssessmentLesson();
    if (!assessment) {
      throw new Error('Completed assessment not found');
    }

    return { onboardingData, assessment };
  }
  private getLanguageConfig(onboardingData: OnboardingModel) {
    return {
      targetLanguage:
        onboardingData.targetLanguage || this.lessonConfig.defaultLanguage,
      proficiencyLevel:
        onboardingData.proficiencyLevel?.toLowerCase() ||
        this.lessonConfig.defaultProficiency,
      learningPurpose:
        onboardingData.learningPurpose || this.lessonConfig.defaultPurpose,
      sourceLanguage: onboardingData.nativeLanguage || 'English',
    };
  }

  private async generateLessonsForTopic(
    topic: string,
    languageConfig: ReturnType<typeof this.getLanguageConfig>,
    adaptiveRequest: AdaptiveLessonGenerationRequest
  ): Promise<LessonModel[]> {
    try {
      const generatedResult = await this.lessonGeneratorService.generateLesson(
        topic,
        languageConfig.targetLanguage,
        languageConfig.proficiencyLevel,
        languageConfig.sourceLanguage,
        adaptiveRequest
      );

      const lessonItems = Array.isArray(generatedResult.data)
        ? generatedResult.data
        : generatedResult.data
        ? [generatedResult.data]
        : [];

      // Check if the array is empty or contains only falsy values
      if (lessonItems.length === 0 || !lessonItems[0]) {
        // Log the error as expected by the test when AI returns no usable data
        logger.error('Failed to generate lesson for topic', {
          topic,
          reason: 'AI returned empty or invalid result',
        });
        return []; // Return empty array gracefully
      }

      return Promise.all(
        lessonItems.map(async (lessonItem: any) => {
          if (!lessonItem || !lessonItem.steps) {
            logger.warn('Invalid lesson item structure received from AI', {
              topic,
              lessonItem,
            });
            return null; // Skip this invalid item
          }
          const audioSteps =
            await this.lessonGeneratorService.generateAudioForSteps(
              lessonItem.steps as LessonStep[],
              languageConfig.targetLanguage,
              languageConfig.sourceLanguage
            );
          // Ensure createLesson receives valid data
          if (!lessonItem.focusArea || !lessonItem.targetSkills) {
            logger.warn(
              'Missing focusArea or targetSkills in generated lesson item',
              { topic, lessonItem }
            );
            return null; // Skip creation if essential data is missing
          }

          return this.createLesson({
            focusArea: lessonItem.focusArea,
            targetSkills: lessonItem.targetSkills,
            steps: audioSteps,
          });
        })
      ).then(
        (results) =>
          results.filter((lesson) => lesson !== null) as LessonModel[]
      );
    } catch (error) {
      logger.error('Failed to generate lesson for topic', { topic, error });
      return []; // Return empty array to prevent failing entire batch
    }
  }

  async generateInitialLessons(): Promise<LessonModel[]> {
    const { onboardingData, assessment } = await this.validateAssessmentData();
    const languageConfig = this.getLanguageConfig(onboardingData);

    const assessmentTopics = assessment.proposedTopics || [];
    const adaptiveRequest = this.constructAdaptiveRequest(assessment);
    const learningPurposeTopics = this.getTopicsFromLearningPurpose(
      languageConfig.learningPurpose
    );

    const selectedTopics = this.selectPrioritizedTopics(
      assessmentTopics,
      [], // audioMetricsTopics seems unused in original code
      learningPurposeTopics,
      languageConfig.proficiencyLevel
    );

    logger.info('Starting lesson generation for topics', { selectedTopics });

    const lessonPromises = selectedTopics.map((topic) =>
      this.generateLessonsForTopic(topic, languageConfig, adaptiveRequest)
    );

    try {
      const lessonsNested = await Promise.all(lessonPromises);
      return lessonsNested.flat();
    } catch (error) {
      logger.error('Critical error in lesson generation', { error });
      throw new Error('Failed to generate initial lessons');
    }
  }

  // New helper method to intelligently select and prioritize topics
  private selectPrioritizedTopics(
    assessmentTopics: string[],
    audioMetricsTopics: string[],
    learningPurposeTopics: string[],
    proficiencyLevel: string
  ): string[] {
    // Create a map to score topics based on their source and frequency
    const topicScores: Record<string, number> = {};

    // Score topics from different sources with different weights
    // Audio metrics topics get highest priority as they're most personalized
    audioMetricsTopics.forEach((topic) => {
      const normalizedTopic = this.normalizeTopic(topic);
      topicScores[normalizedTopic] = (topicScores[normalizedTopic] || 0) + 3;
    });

    // Assessment topics get second priority
    assessmentTopics.forEach((topic) => {
      const normalizedTopic = this.normalizeTopic(topic);
      topicScores[normalizedTopic] = (topicScores[normalizedTopic] || 0) + 2;
    });

    // Learning purpose topics get lowest priority but ensure some basics are covered
    learningPurposeTopics.forEach((topic) => {
      const normalizedTopic = this.normalizeTopic(topic);
      topicScores[normalizedTopic] = (topicScores[normalizedTopic] || 0) + 1;
    });

    // For beginners, ensure basic topics are included
    if (proficiencyLevel === 'beginner') {
      const basicTopics = ['Greetings', 'Introductions', 'Basic Phrases'];
      basicTopics.forEach((topic) => {
        const normalizedTopic = this.normalizeTopic(topic);
        topicScores[normalizedTopic] =
          (topicScores[normalizedTopic] || 0) + 1.5;
      });
    }

    // Sort topics by score and limit to top 3
    const sortedTopics = Object.entries(topicScores)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 3);

    // If we somehow ended up with less than 3 topics, fill with defaults
    if (sortedTopics.length < 3) {
      const defaultTopics = [
        'Daily Conversations',
        'Practical Vocabulary',
        'Essential Grammar',
      ];

      for (const topic of defaultTopics) {
        if (sortedTopics.length < 3 && !sortedTopics.includes(topic)) {
          sortedTopics.push(topic);
        }
      }
    }

    return sortedTopics;
  }

  // Helper to normalize topic strings for comparison
  private normalizeTopic(topic: string): string {
    return topic.trim().toLowerCase().replace(/\s+/g, '-');
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

    // Check if max attempts has been reached
    if (step.attempts >= step.maxAttempts) {
      logger.info('Maximum attempts reached', {
        stepId,
        attempts: step.attempts,
        maxAttempts: step.maxAttempts,
      });

      if (!step.expectedAnswer) {
        throw new Error('Expected answer not found');
      }

      // Record the attempt but mark as incorrect, preserving user response
      return this.lessonRepository.recordStepAttempt(lessonId, stepId, {
        userResponse: step.expectedAnswer,
        correct: true, // to proceed on the frontend
      });
    }

    logger.info('step.type ', step.type);

    // Validate user response for most step types
    if (
      step.type !== 'instruction' &&
      step.type !== 'summary' &&
      step.type !== 'feedback'
    ) {
      if (!userResponse) {
        throw new Error('No response provided');
      }
      if (userResponse.length <= 1) {
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

          if(userResponse.toLowerCase().includes('skip')){
            correct = true;
            break;
          }
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
          const essentialExpectedPart = normalizedExpectedAnswer
            .replace(/\.{3,}/g, '')
            .trim();

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
            const matchedWordCount = userWords.filter(
              (word) => essentialWords.includes(word) && word.length > 1
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
    const updatedStep = await this.lessonRepository.recordStepAttempt(lessonId, stepId, {
      userResponse,
      correct,
    });
    logger.info('updatedStep', { updatedStep });
    return { ...updatedStep, userResponse: step.expectedAnswer || '' };
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

  async checkAndGenerateNewLessons(): Promise<LessonModel[]> {
    const currentLessons = await this.lessonRepository.getLessons();
    logger.info('currentLessons', { currentLessons });
    // If there are no lessons or not all are complete, just return
    if (currentLessons.length === 0) throw new Error('No lessons found');
    const allComplete = currentLessons.every((lesson) => lesson.completed);
    if (!allComplete) return [];

    const newLessons = await this.generateNewLessonsBasedOnProgress();
    return newLessons;
  }

  async generateNewLessonsBasedOnProgress(): Promise<LessonModel[]> {
    // Get all completed lessons to analyze performance
    const allLessons = await this.getLessons();
    const completedLessons = allLessons.filter((lesson) => lesson.completed);
    const onboardingData = await this.onboardingRepository.getOnboarding();

    if (!onboardingData) {
      throw new Error('User onboarding data not found');
    }

    if (completedLessons.length === 0) {
      throw new Error('No completed lessons found to analyze');
    }

    const userId = onboardingData.userId;

    let learningProgress: LearningProgressModel | null = null;
    try {
      learningProgress =
        await this.learningProgressService.getLearningProgressWithDetails(
          userId
        );
      if (!learningProgress) {
        logger.warn(
          'Learning progress not found for user, proceeding with lesson metrics only.',
          { userId }
        );
        // Handle case where progress doesn't exist yet - maybe create a default one?
      }
    } catch (error) {
      logger.error(
        'Failed to fetch learning progress, proceeding without it.',
        { userId, error }
      );
    }

    // Extract base preferences
    const targetLanguage = onboardingData.targetLanguage;
    const proficiencyLevel =
      learningProgress?.estimatedProficiencyLevel?.toLowerCase() ||
      onboardingData.proficiencyLevel?.toLowerCase() ||
      'beginner';

    const sourceLanguage = onboardingData.nativeLanguage;

    if (!targetLanguage || !sourceLanguage) {
      throw new Error('Target language or source language not found');
    }

    // Aggregate metrics from completed lessons (both performance metrics and audio metrics)
    const aggregatedMetrics = this.aggregateMetrics(
      completedLessons,
      learningProgress
    );

    // Determine focus areas based on aggregated metrics
    const focusAreas = this.determineFocusAreas(
      aggregatedMetrics,
      proficiencyLevel,
      learningProgress
    );

    // Generate new lessons for each focus area
    const lessonPromises = focusAreas.map(async (topic) => {
      // Create a request with user's learning data for more personalized lessons
      const adaptiveRequest = this.createAdaptiveLessonRequest(
        completedLessons,
        aggregatedMetrics,
        onboardingData,
        learningProgress, // Pass learningProgress
        topic
      );

      // Generate lesson with adaptive data when available
      const generatedResult = await this.lessonGeneratorService.generateLesson(
        topic,
        targetLanguage,
        proficiencyLevel, // Use potentially updated proficiency
        sourceLanguage,
        adaptiveRequest // Pass the enhanced adaptive request
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
          logger.info('generating audio for LESSON steps', { audioSteps });
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

  // Add new method to aggregate metrics from completed lessons
  private aggregateMetrics(
    completedLessons: LessonModel[],
    learningProgress: LearningProgressModel | null
  ): {
    // ... (existing fields) ...
    avgAccuracy: number;
    avgPronunciationScore: number;
    avgGrammarScore: number;
    avgVocabularyScore: number;
    avgFluencyScore: number;
    weaknesses: string[]; // Combined weaknesses
    strengths: string[]; // Combined strengths
    audioAnalysisAvailable: boolean;
    recommendedTopics: string[];
    mostRecentAudioMetrics?: AudioMetrics;
    // Add overall progress info if needed directly here, or rely on passing learningProgress down
    overallScore?: number | null;
    learningTrajectory?: LearningTrajectory;
  } {
    // Initialize with learning progress data
    const allWeaknesses = new Set<string>(learningProgress?.weaknesses ?? []);
    const allStrengths = new Set<string>(learningProgress?.strengths ?? []);
    const allTopics = new Set<string>();

    // Initialize aggregated metrics
    const result = {
      errorPatterns: this.aggregateErrorPatterns(completedLessons),
      avgAccuracy: this.calculateAverageAccuracy(completedLessons),
      avgPronunciationScore: 0,
      avgGrammarScore: 0,
      avgVocabularyScore: 0,
      avgFluencyScore: 0,
      weaknesses: [] as string[],
      strengths: [] as string[],
      audioAnalysisAvailable: false,
      recommendedTopics: [] as string[],
      mostRecentAudioMetrics: undefined as AudioMetrics | undefined,
      overallScore: learningProgress?.overallScore, // Add overall score
      learningTrajectory: learningProgress?.learningTrajectory, // Add trajectory
    };

    // Find lessons with audio metrics
    const lessonsWithAudioMetrics = completedLessons
      .filter((lesson) => lesson.audioMetrics)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    if (lessonsWithAudioMetrics.length > 0) {
      result.audioAnalysisAvailable = true;

      // Store most recent audio metrics for detailed insights
      result.mostRecentAudioMetrics =
        lessonsWithAudioMetrics[0].audioMetrics ?? undefined;

      // Calculate average scores from audio metrics
      // TODO: initial lessons are not being generated / gemini 503 issue
      // TODO: user profile can delete the data
      // TODO: basic learning progress integration
      const audioMetricsScores = {
        pronunciation: [] as number[],
        grammar: [] as number[],
        vocabulary: [] as number[],
        fluency: [] as number[],
      };

      // Collect strengths, weaknesses, and topics from all audio metrics
      lessonsWithAudioMetrics.forEach((lesson) => {
        if (lesson.audioMetrics) {
          // Add scores for averaging
          audioMetricsScores.pronunciation.push(
            lesson.audioMetrics.pronunciationScore
          );
          audioMetricsScores.grammar.push(lesson.audioMetrics.grammarScore);
          audioMetricsScores.vocabulary.push(
            lesson.audioMetrics.vocabularyScore
          );
          audioMetricsScores.fluency.push(lesson.audioMetrics.fluencyScore);

          // Collect areas for improvement
          lesson.audioMetrics.pronunciationAssessment.areas_for_improvement.forEach(
            (area) => allWeaknesses.add(area)
          );

          // Collect strengths
          lesson.audioMetrics.pronunciationAssessment.strengths.forEach(
            (strength) => allStrengths.add(strength)
          );
          lesson.audioMetrics.grammarAssessment.grammar_strengths.forEach(
            (strength) => allStrengths.add(strength)
          );

          // Collect suggested topics
          lesson.audioMetrics.suggestedTopics.forEach((topic) =>
            allTopics.add(topic)
          );
        }
      });

      // Calculate averages
      const calculateAverage = (arr: number[]) =>
        arr.length > 0
          ? arr.reduce((sum, val) => sum + val, 0) / arr.length
          : 0;

      result.avgPronunciationScore = calculateAverage(
        audioMetricsScores.pronunciation
      );
      result.avgGrammarScore = calculateAverage(audioMetricsScores.grammar);
      result.avgVocabularyScore = calculateAverage(
        audioMetricsScores.vocabulary
      );
      result.avgFluencyScore = calculateAverage(audioMetricsScores.fluency);

      // Store weaknesses, strengths, and topics
      result.weaknesses = Array.from(allWeaknesses);
      result.strengths = Array.from(allStrengths);
      result.recommendedTopics = Array.from(allTopics);
    }

    // Add lesson performance metrics
    completedLessons.forEach((lesson) => {
      // First check if performanceMetrics exists
      if (lesson.performanceMetrics) {
        // Then use type guard on the JsonValue
        if (isPerformanceMetrics(lesson.performanceMetrics)) {
          if (Array.isArray(lesson.performanceMetrics.weaknesses)) {
            lesson.performanceMetrics.weaknesses.forEach((w: string) =>
              allWeaknesses.add(w)
            );
          }
          if (Array.isArray(lesson.performanceMetrics.strengths)) {
            lesson.performanceMetrics.strengths.forEach((s: string) =>
              allStrengths.add(s)
            );
          }
        }
      }
    });

    return result;
  }

  // Updated method to determine focus areas based on rich metrics data
  private determineFocusAreas(
    metrics: ReturnType<typeof this.aggregateMetrics>,
    proficiencyLevel: string,
    learningProgress: LearningProgressModel | null
  ): string[] {
    const focusAreas = new Set<string>();

    // Prioritize learning progress weaknesses
    if (learningProgress?.weaknesses) {
      learningProgress.weaknesses
        .slice(0, 2)
        .forEach((weakness) => focusAreas.add(this.normalizeTopic(weakness)));
    }

    // Add low mastery topics from learning progress
    if (learningProgress?.topics) {
      learningProgress.topics
        .filter(
          (t) =>
            t.masteryLevel === MasteryLevel.NotStarted ||
            t.masteryLevel === MasteryLevel.Seen ||
            t.masteryLevel === MasteryLevel.Learning
        )
        .sort(
          (a, b) =>
            (a.lastStudiedAt?.getTime() ?? 0) -
            (b.lastStudiedAt?.getTime() ?? 0)
        )
        .slice(0, 2)
        .forEach((t) => focusAreas.add(this.normalizeTopic(t.topicName)));
    }

    // If we have audio analysis, use it to determine priorities
    if (metrics.audioAnalysisAvailable && metrics.mostRecentAudioMetrics) {
      // First prioritize topics directly recommended from audio analysis
      if (metrics.recommendedTopics.length > 0) {
        // Take the top 2 recommended topics
        metrics.recommendedTopics
          .slice(0, 2)
          .forEach((topic) => focusAreas.add(topic));
      }

      // Then prioritize areas of weakness
      const audioMetrics = metrics.mostRecentAudioMetrics;

      // Identify weakest area to focus on
      const scoreMap = [
        {
          area: 'Pronunciation Practice',
          score: metrics.avgPronunciationScore,
        },
        { area: 'Grammar Skills', score: metrics.avgGrammarScore },
        { area: 'Vocabulary Building', score: metrics.avgVocabularyScore },
        { area: 'Speaking Fluency', score: metrics.avgFluencyScore },
      ];

      // Sort by lowest score first
      scoreMap.sort((a, b) => a.score - b.score);

      // Add the weakest area if not already covered by recommendations
      if (
        scoreMap[0].score < 75 &&
        !Array.from(focusAreas).some((topic) =>
          topic.toLowerCase().includes(scoreMap[0].area.toLowerCase())
        )
      ) {
        focusAreas.add(scoreMap[0].area);
      }

      // Add grammar focus areas if grammar is weak
      if (metrics.avgGrammarScore < 70) {
        audioMetrics.grammarFocusAreas
          .slice(0, 1)
          .forEach((area) => focusAreas.add(area));
      }

      // Add vocabulary domains if vocabulary is weak
      if (metrics.avgVocabularyScore < 70) {
        audioMetrics.vocabularyDomains
          .slice(0, 1)
          .forEach((domain) => focusAreas.add(domain));
      }
    } else {
      // Fall back to error pattern-based focus areas if no audio metrics
      // Adjust based on accuracy
      if (metrics.avgAccuracy < 50) {
        focusAreas.add('Vocabulary Building');
      } else if (metrics.avgAccuracy > 80 && proficiencyLevel === 'beginner') {
        focusAreas.add('Conversational Practice');
      }
    }

    // Ensure we have at least one topic
    if (focusAreas.size === 0) {
      focusAreas.add('General Practice');
    }

    // Limit to 3 focus areas
    return Array.from(focusAreas).slice(0, 3);
  }

  // Helper method to create an adaptive lesson request based on user's learning data
  private createAdaptiveLessonRequest(
    completedLessons: LessonModel[],
    metrics: ReturnType<typeof this.aggregateMetrics>,
    onboardingData: OnboardingModel,
    learningProgress: LearningProgressModel | null,
    focusTopic: string
  ): any {
    // Use the most recent audio metrics if available
    if (!metrics.mostRecentAudioMetrics) {
      return undefined;
    }

    const audioMetrics = metrics.mostRecentAudioMetrics;
    const mostRecentLesson = completedLessons.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];

    // Extract grammar rules to focus on
    const grammarRulesToFocus =
      audioMetrics.grammarAssessment.grammar_rules_to_review.map((rule) => ({
        rule:
          typeof rule === 'object' && 'rule' in rule ? rule.rule : String(rule),
        priority:
          typeof rule === 'object' && 'priority' in rule
            ? String(rule.priority)
            : 'medium',
      }));

    // Extract common grammar errors (handling possible type variations)
    const grammarCommonErrors =
      audioMetrics.grammarAssessment.error_patterns.map((pattern) => ({
        category:
          typeof pattern === 'object' && 'category' in pattern
            ? pattern.category
            : 'general',
        description:
          typeof pattern === 'object' && 'description' in pattern
            ? pattern.description
            : String(pattern),
      }));

    // Extract vocabulary areas for improvement
    const vocabularyAreas =
      audioMetrics.vocabularyAssessment.areas_for_expansion.map((area) => ({
        topic:
          typeof area === 'object' && 'topic' in area ? area.topic : 'general',
        suggestedVocabulary:
          typeof area === 'object' && 'suggested_vocabulary' in area
            ? Array.isArray(area.suggested_vocabulary)
              ? area.suggested_vocabulary
              : []
            : [],
      }));

    return {
      userInfo: {
        nativeLanguage: onboardingData.nativeLanguage || 'English',
        targetLanguage: onboardingData.targetLanguage || 'English',
        proficiencyLevel:
          learningProgress?.estimatedProficiencyLevel || 'beginner',
        learningPurpose: onboardingData.learningPurpose || 'general',
      },
      focusTopic,
      overallProgress: learningProgress
        ? {
            estimatedProficiencyLevel:
              learningProgress.estimatedProficiencyLevel,
            overallScore: learningProgress.overallScore,
            learningTrajectory: learningProgress.learningTrajectory,
            persistentWeaknesses: learningProgress.weaknesses,
            lowMasteryTopics:
              learningProgress.topics
                ?.filter((t) => t.masteryLevel !== MasteryLevel.Mastered)
                .map((t) => t.topicName) ?? [],
          }
        : undefined,
      performanceMetrics: {
        avgAccuracy: metrics.avgAccuracy,
        avgPronunciationScore: metrics.avgPronunciationScore,
        avgGrammarScore: metrics.avgGrammarScore,
        avgVocabularyScore: metrics.avgVocabularyScore,
        avgFluencyScore: metrics.avgFluencyScore,
        strengths: metrics.strengths,
        weaknesses: metrics.weaknesses,
      },
      improvementAreas: {
        pronunciation: audioMetrics.pronunciationAssessment.problematic_sounds,
        grammar: {
          rulesToFocus: grammarRulesToFocus,
          commonErrors: grammarCommonErrors,
        },
        vocabulary: vocabularyAreas,
      },
      learningRecommendations: {
        suggestedTopics: audioMetrics.suggestedTopics,
        focusAreas: audioMetrics.grammarFocusAreas,
        nextSkillTargets: audioMetrics.nextSkillTargets,
      },
      learningStyle: {
        effectiveApproaches: audioMetrics.effectiveApproaches,
        preferredPatterns: audioMetrics.preferredPatterns,
      },
      previousLesson: mostRecentLesson
        ? {
            id: mostRecentLesson.id,
            focusArea: mostRecentLesson.focusArea,
            targetSkills: mostRecentLesson.targetSkills,
          }
        : undefined,
    };
  }

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

    // 3. Determine proper mime type
    // 2. Convert the Blob to a Buffer for upload
    const arrayBuffer = await sessionRecording.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Determine proper mime type
    const mimeType = sessionRecording.type || 'audio/webm';

    // 4. Upload the file
    const fileName = `lesson-${lesson.id}-${Date.now()}.webm`;
    logger.info('Uploading recording file', {
      fileName,
      mimeType,
      size: buffer.length,
    });

    const fileUri = await this.recordingService.uploadFile(
      buffer,
      mimeType,
      fileName
    );
    logger.log('File URI:', fileUri);

    logger.log('Sending recording to AI for analysis');
    // send recording to AI
    let aiResponse: Record<string, unknown>;
    if (process.env.MOCK_RECORDING_AI_ANALYSIS === 'true') {
      aiResponse = mockAudioMetrics;
    } else {
      logger.info('Sending recording to AI for analysis');
      aiResponse = await this.recordingService.submitLessonRecordingSession(
        fileUri, // Now using file URI instead of base64
        Number(recordingTime),
        Number(recordingSize),
        { targetLanguage, nativeLanguage: sourceLanguage },
        lesson
      );
    }

    logger.info('AI response received', { aiResponse });

    // 3. convert ai  response to audioMetrics model.
    const audioMetrics = this.convertAiResponseToAudioMetrics(aiResponse);
    logger.info('Audio metrics generated', { audioMetrics });

    return this.lessonRepository.updateLesson(lesson.id, { audioMetrics });
  }

  private convertAiResponseToAudioMetrics(
    aiResponse: Record<string, unknown>
  ): AudioMetrics {
    // Extract top-level metrics with defaults if not present
    const pronunciationScore =
      typeof aiResponse.pronunciationScore === 'number'
        ? aiResponse.pronunciationScore
        : 0;
    const fluencyScore =
      typeof aiResponse.fluencyScore === 'number' ? aiResponse.fluencyScore : 0;
    const grammarScore =
      typeof aiResponse.grammarScore === 'number' ? aiResponse.grammarScore : 0;
    const vocabularyScore =
      typeof aiResponse.vocabularyScore === 'number'
        ? aiResponse.vocabularyScore
        : 0;
    const overallPerformance =
      typeof aiResponse.overallPerformance === 'number'
        ? aiResponse.overallPerformance
        : 0;

    // Generate a unique ID for the metrics
    const id = randomUUID();

    // Extract CEFR level and learning trajectory
    const proficiencyLevel =
      typeof aiResponse.proficiencyLevel === 'string'
        ? aiResponse.proficiencyLevel
        : 'A1';

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
        specific_features: [],
      },
      phoneme_analysis: [],
      problematic_sounds: [],
      strengths: [],
      areas_for_improvement: [],
    };

    const fluencyAssessment = getFluencyAssessment(
      aiResponse.fluencyAssessment as JsonValue
    ) || {
      overall_score: fluencyScore,
      speech_rate: {
        words_per_minute: 0,
        evaluation: 'appropriate' as SpeechRateEvaluation,
      },
      hesitation_patterns: {
        frequency: 'occasional' as HesitationFrequency,
        average_pause_duration: 0,
        typical_contexts: [],
      },
      rhythm_and_intonation: {
        naturalness: 0,
        sentence_stress_accuracy: 0,
        intonation_pattern_accuracy: 0,
      },
    };

    const grammarAssessment = getGrammarAssessment(
      aiResponse.grammarAssessment as JsonValue
    ) || {
      overall_score: grammarScore,
      error_patterns: [],
      grammar_rules_to_review: [],
      grammar_strengths: [],
    };

    const vocabularyAssessment = getVocabularyAssessment(
      aiResponse.vocabularyAssessment as JsonValue
    ) || {
      overall_score: vocabularyScore,
      range: 'adequate' as VocabularyRange,
      appropriateness: 0,
      precision: 0,
      areas_for_expansion: [],
    };

    const exerciseCompletion = getExerciseCompletion(
      aiResponse.exerciseCompletion as JsonValue
    ) || {
      overall_score: 0,
      exercises_analyzed: [],
      comprehension_level: 'fair' as ComprehensionLevel,
    };

    // Extract string arrays safely
    const extractStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string') as string[];
      }
      return [];
    };

    const suggestedTopics = extractStringArray(aiResponse.suggestedTopics);
    const grammarFocusAreas = extractStringArray(aiResponse.grammarFocusAreas);
    const vocabularyDomains = extractStringArray(aiResponse.vocabularyDomains);
    const nextSkillTargets = extractStringArray(aiResponse.nextSkillTargets);
    const preferredPatterns = extractStringArray(aiResponse.preferredPatterns);
    const effectiveApproaches = extractStringArray(
      aiResponse.effectiveApproaches
    );

    // Extract metadata
    const audioRecordingUrl =
      typeof aiResponse.audioRecordingUrl === 'string'
        ? aiResponse.audioRecordingUrl
        : null;
    const recordingDuration =
      typeof aiResponse.recordingDuration === 'number'
        ? aiResponse.recordingDuration
        : null;

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
      updatedAt: new Date(),
    };
  }
}
