import {
  AssessmentLesson,
  AssessmentStep,
  AudioMetrics,
  getExerciseCompletion,
  getFluencyAssessment,
  getGrammarAssessment,
  getPronunciationAssessment,
  getVocabularyAssessment,
  LessonModel,
  OnboardingModel,
} from '@/models/AppAllModels.model';
import {
  AiAdaptiveSuggestions,
  AiLessonAnalysisResponse,
  AiPerformanceMetrics,
  AiProgressTracking,
  IOnboardingRepository,
} from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import LessonService from './lesson.service';
import { IAssessmentGeneratorService } from './assessment-generator.service';
import RecordingService from './recording.service';
import { mockAudioMetrics } from '@/__mocks__/generated-audio-metrics.mock';
import {
  ComprehensionLevel,
  HesitationFrequency,
  LanguageInfluenceLevel,
  LearningTrajectory,
  SpeechRateEvaluation,
  VocabularyRange,
} from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { LearningProgressRepository } from '@/repositories/learning-progress.repository';
import LearningProgressService from './learning-progress.service';
import { randomUUID } from 'crypto';

export default class OnboardingService {
  private onboardingRepository: IOnboardingRepository;
  private lessonService: LessonService;
  private assessmentGeneratorService: IAssessmentGeneratorService;
  private recordingService: RecordingService;
  private learningProgressService: LearningProgressService;
  constructor(
    onboardingRepository: IOnboardingRepository,
    lessonService: LessonService,
    assessmentGeneratorService: IAssessmentGeneratorService
  ) {
    this.onboardingRepository = onboardingRepository;
    this.lessonService = lessonService;
    this.assessmentGeneratorService = assessmentGeneratorService;
    this.recordingService = new RecordingService();
    const progressRepository = new LearningProgressRepository();
    this.learningProgressService = new LearningProgressService(
      progressRepository
    ); // Instantiate it here
  }

  getOnboarding = async (): Promise<OnboardingModel | null> => {
    const onboarding = await this.onboardingRepository.getOnboarding();
    logger.info('Onboarding:', onboarding);
    return onboarding;
  };

  createOnboarding = async (): Promise<OnboardingModel> => {
    return this.onboardingRepository.createOnboarding();
  };

  updateOnboarding = async (
    step: string,
    formData: any
  ): Promise<OnboardingModel> => {
    return this.onboardingRepository.updateOnboarding(step, formData);
  };

  markOnboardingAsCompleteAndGenerateLessons =
    async (): Promise<OnboardingModel> => {
      const onboarding = await this.onboardingRepository.completeOnboarding();
      await this.lessonService.generateInitialLessons();
      return onboarding;
    };

  deleteOnboarding = async (): Promise<void> => {
    return this.onboardingRepository.deleteOnboarding();
  };

  getStatus = async (): Promise<boolean> => {
    return this.onboardingRepository.getStatus();
  };

  async getAssessmentLesson(): Promise<AssessmentLesson> {
    try {
      // First check if there's already an assessment lesson
      const existingAssessment =
        await this.onboardingRepository.getAssessmentLesson();
      if (existingAssessment) {
        return existingAssessment;
      }

      // Get onboarding data to get language preferences
      const onboarding = await this.onboardingRepository.getOnboarding();

      if (
        !onboarding?.targetLanguage ||
        !onboarding?.nativeLanguage ||
        !onboarding?.proficiencyLevel
      ) {
        throw new Error('Missing required parameters');
      }

      // Generate assessment steps
      const steps =
        await this.assessmentGeneratorService.generateAssessmentSteps(
          onboarding?.targetLanguage,
          onboarding?.nativeLanguage,
          onboarding?.proficiencyLevel
        );

      logger.info(`Generated ${steps} assessment steps without audio`);

      const audioSteps =
        await this.assessmentGeneratorService.generateAudioForSteps(
          steps,
          onboarding?.targetLanguage || 'English',
          onboarding?.nativeLanguage || 'English'
        );
      logger.info('generated audio steps', audioSteps);

      const assessmentLesson = {
        userId: onboarding?.userId,
        description: `Comprehensive ${
          onboarding?.targetLanguage || 'German'
        } language assessment`,
        completed: false,
        sourceLanguage: onboarding?.nativeLanguage || 'English',
        targetLanguage: onboarding?.targetLanguage || 'German',
        metrics: {
          accuracy: 0,
          pronunciationScore: 0,
          grammarScore: 0,
          vocabularyScore: 0,
          overallScore: 0,
          strengths: [],
          weaknesses: [],
        },
        proposedTopics: [],
        summary: null,
        steps: audioSteps,
      };

      logger.info(`Assessment lesson: ${JSON.stringify(assessmentLesson)}`);
      // Save to database
      return this.onboardingRepository.createAssessmentLesson(
        onboarding?.userId,
        assessmentLesson
      );
    } catch (error) {
      logger.error('Error generating assessment lesson:', error);
      throw error;
    }
  }

  async completeAssessmentLesson(
    lessonId: string,
    userResponse: string
  ): Promise<AssessmentLesson> {
    // get assessment lesson
    const assessmentLesson =
      await this.onboardingRepository.getAssessmentLessonById(lessonId);
    if (!assessmentLesson) {
      throw new Error('Assessment lesson not found');
    }

    const results =
      await this.assessmentGeneratorService.generateAssessmentResult(
        assessmentLesson
      );

    assessmentLesson.metrics = results.metrics;
    assessmentLesson.summary = results.summary;
    assessmentLesson.proposedTopics = results.proposedTopics;

    logger.info(`Assessment lesson: ${JSON.stringify(assessmentLesson)}`);

    // complete assessment lesson
    const completedLesson =
      await this.onboardingRepository.completeAssessmentLesson(
        assessmentLesson,
        {
          summary: results.summary,
          metrics: results.metrics,
          proposedTopics: results.proposedTopics,
        }
      );

    this.learningProgressService
      .updateProgressAfterAssessment(completedLesson.userId, completedLesson)
      .catch((err) => {
        logger.error(
          'Failed to update learning progress after assessment completion',
          {
            userId: completedLesson.userId,
            assessmentId: completedLesson.id,
            error: err,
          }
        );
      });

    const completedOnboarding =
      await this.onboardingRepository.completeOnboarding();
    logger.info('completed onboarding', completedOnboarding);
    logger.info('completed lesson', completedLesson);
    return completedLesson;
  }

  async recordStepAttempt(
    lessonId: string,
    stepId: string,
    userResponse: string
  ): Promise<AssessmentStep> {
    logger.info('recordStepAttempt', { lessonId, stepId, userResponse });

    try {
      const lesson = await this.onboardingRepository.getAssessmentLessonById(
        lessonId
      );
      if (!lesson) {
        throw new Error('Assessment lesson not found');
      }
      const step = lesson.steps.find((s) => s.id === stepId);
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

        // Record the attempt but mark as incorrect, preserving user response
        return this.onboardingRepository.recordStepAttempt(lessonId, stepId, {
          userResponse: step.expectedAnswer || '',
          correct: true, // to proceed on the frontend
        });
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
        if (userResponse.length <= 1) {
          throw new Error('Response is too short');
        }
      }
      let correct = false;

      logger.info('processing the step attempt', { step, userResponse });

      // Handle different assessment step types
      switch (step.type) {
        case 'question':
          // For questions, compare with the expectedAnswer if available
          if (step.expectedAnswer) {
            logger.info('step.expectedAnswer', step.expectedAnswer);
            logger.info('userResponse', userResponse);
            if (userResponse.toLowerCase().includes('skip')) {
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

        case 'instruction':
        case 'summary':
        case 'feedback':
          // These types just need acknowledgment
          correct = true;
          // For these types, we use a default "Acknowledged" response if none provided
          userResponse = userResponse || 'Acknowledged';
          break;

        default:
          logger.warn(`Unknown assessment step type: ${step.type}`);
          correct = false;
      }

      // Record the attempt
      const updatedStep = await this.onboardingRepository.recordStepAttempt(
        lessonId,
        stepId,
        {
          userResponse,
          correct,
        }
      );
      logger.info('updatedStep', { updatedStep });

      // return updated step with user response as expected answer
      return {
        ...updatedStep,
        userResponse: step.expectedAnswer || '',
      };
    } catch (error) {
      logger.error('Error recording step attempt:', error);
      throw error;
    }
  }

  updateOnboardingAssessmentLesson = async (
    lessonId: string,
    lessonData: Partial<AssessmentLesson>
  ) => {
    if (!lessonId) {
      throw new Error('Lesson ID is required');
    }

    return this.onboardingRepository.updateOnboardingAssessmentLesson(
      lessonId,
      lessonData
    );
  };
  async processAssessmentLessonRecording(
    sessionRecording: Blob,
    lesson: AssessmentLesson,
    recordingTime: number,
    recordingSize: number
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
    if (false) {
      // if (process.env.NEXT_PUBLIC_MOCK_RECORDING_AI_ANALYSIS === 'true') {
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
    const audioMetrics = this.convertAiResponseToAudioMetrics(aiResponse);

    logger.debug('audioMetrics in recording ai response', audioMetrics);
    // 4. update lesson with sessionRecordingMetrics, lesson should have a foreign key to audioMetrics
    return this.onboardingRepository.updateOnboardingAssessmentLesson(
      lesson.id,
      { audioMetrics }
    );
  }

  private convertAiResponseToAudioMetrics(
    aiResponse: AiLessonAnalysisResponse // Use the specific interface type
  ): AudioMetrics {
    logger.debug(
      '>>> convertAiResponseToAudioMetrics INPUT:',
      JSON.stringify(aiResponse, null, 2)
    );

    // Safely access nested objects
    const performanceMetrics: AiPerformanceMetrics | undefined =
      aiResponse.performance_metrics;
    const progressTracking: AiProgressTracking | undefined =
      aiResponse.progress_tracking;
    const adaptiveSuggestions: AiAdaptiveSuggestions | undefined =
      aiResponse.adaptive_learning_suggestions;

    // Extract top-level metrics safely, providing defaults if objects or properties are missing
    const pronunciationScore =
      typeof performanceMetrics?.pronunciation_score === 'number'
        ? performanceMetrics.pronunciation_score
        : 0;
    const fluencyScore =
      typeof performanceMetrics?.fluency_score === 'number'
        ? performanceMetrics.fluency_score
        : 0;
    const grammarScore =
      typeof performanceMetrics?.grammar_accuracy === 'number' // Use correct source key
        ? performanceMetrics.grammar_accuracy
        : 0;
    const vocabularyScore =
      typeof performanceMetrics?.vocabulary_score === 'number'
        ? performanceMetrics.vocabulary_score
        : 0;
    const overallPerformance =
      typeof performanceMetrics?.overall_performance === 'number'
        ? performanceMetrics.overall_performance
        : 0;

    const id = randomUUID();

    // Extract CEFR level and learning trajectory safely
    const proficiencyLevel =
      typeof progressTracking?.estimated_proficiency_level === 'string'
        ? progressTracking.estimated_proficiency_level
        : 'A1'; // Default

    let learningTrajectory: LearningTrajectory = 'steady'; // Default
    const trajectoryFromAI = progressTracking?.learning_trajectory;
    if (trajectoryFromAI === 'accelerating') {
      learningTrajectory = 'accelerating';
    } else if (trajectoryFromAI === 'plateauing') {
      learningTrajectory = 'plateauing';
    }

    // Extract detailed assessment data - Pass the correct top-level objects
    // Use optional chaining `?.` in case the assessment object itself is missing
    const pronunciationAssessment = getPronunciationAssessment(
      aiResponse?.pronunciation_assessment as JsonValue
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
      aiResponse?.fluency_assessment as JsonValue
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
      aiResponse?.grammar_assessment as JsonValue
    ) || {
      overall_score: grammarScore,
      error_patterns: [],
      grammar_rules_to_review: [],
      grammar_strengths: [],
    };

    const vocabularyAssessment = getVocabularyAssessment(
      aiResponse?.vocabulary_assessment as JsonValue
    ) || {
      overall_score: vocabularyScore,
      range: 'adequate' as VocabularyRange,
      appropriateness: 0,
      precision: 0,
      areas_for_expansion: [],
    };

    const exerciseCompletion = getExerciseCompletion(
      aiResponse?.exercise_completion as JsonValue
    ) || {
      overall_score: 0,
      exercises_analyzed: [],
      comprehension_level: 'fair' as ComprehensionLevel,
    };

    // Helper to extract string arrays safely
    const extractStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string') as string[];
      }
      return [];
    };

    // Extract learning suggestions safely using optional chaining
    const suggestedTopics = extractStringArray(
      adaptiveSuggestions?.suggested_topics
    );
    const grammarFocusAreas = extractStringArray(
      adaptiveSuggestions?.grammar_focus_areas
    );
    const vocabularyDomains = extractStringArray(
      adaptiveSuggestions?.vocabulary_domains
    );
    const nextSkillTargets = extractStringArray(
      adaptiveSuggestions?.next_skill_targets
    );
    // Handle potential nesting within learning_style_observations or direct access
    const preferredPatterns = extractStringArray(
      adaptiveSuggestions?.preferred_patterns ||
        adaptiveSuggestions?.learning_style_observations?.preferred_patterns
    );
    const effectiveApproaches = extractStringArray(
      adaptiveSuggestions?.effective_approaches ||
        adaptiveSuggestions?.learning_style_observations?.effective_approaches
    );

    // Extract metadata safely
    const audioRecordingUrl =
      typeof aiResponse?.audioRecordingUrl === 'string'
        ? aiResponse.audioRecordingUrl
        : null;
    const recordingDuration =
      typeof aiResponse?.recordingDuration === 'number'
        ? aiResponse.recordingDuration
        : null;

    // Construct and return the AudioMetrics object
    const finalAudioMetrics: AudioMetrics = {
      // Explicitly type the final object
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

    logger.debug(
      '<<< convertAiResponseToAudioMetrics OUTPUT:',
      JSON.stringify(finalAudioMetrics, null, 2)
    );
    return finalAudioMetrics;
  }
}
