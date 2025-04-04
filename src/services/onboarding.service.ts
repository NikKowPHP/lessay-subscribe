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
import { IOnboardingRepository } from '@/lib/interfaces/all-interfaces';
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

export default class OnboardingService {
  private onboardingRepository: IOnboardingRepository;
  private lessonService: LessonService;
  private assessmentGeneratorService: IAssessmentGeneratorService;
  private recordingService: RecordingService;
  constructor(
    onboardingRepository: IOnboardingRepository,
    lessonService: LessonService,
    assessmentGeneratorService: IAssessmentGeneratorService
  ) {
    this.onboardingRepository = onboardingRepository;
    this.lessonService = lessonService;
    this.assessmentGeneratorService = assessmentGeneratorService;
    this.recordingService = new RecordingService();
  }

  getOnboarding = async (): Promise<OnboardingModel | null> => {
    const onboarding = await this.onboardingRepository.getOnboarding();
    logger.info('Onboarding:', onboarding);
    return onboarding;
  };

  createOnboarding = async (): Promise<OnboardingModel> => {
    return this.onboardingRepository.createOnboarding();
  };

  updateOnboarding = async (step: string): Promise<OnboardingModel> => {
    return this.onboardingRepository.updateOnboarding(step);
  };

  completeOnboardingWithLessons = async (): Promise<OnboardingModel> => {
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

  async getAssessmentLesson(userId: string): Promise<AssessmentLesson> {
    try {
      // First check if there's already an assessment lesson
      const existingAssessment =
        await this.onboardingRepository.getAssessmentLesson(userId);
      if (existingAssessment) {
        return existingAssessment;
      }

      // Get onboarding data to get language preferences
      const onboarding = await this.onboardingRepository.getOnboarding();

      // Generate assessment steps
      const steps =
        await this.assessmentGeneratorService.generateAssessmentSteps(
          onboarding?.targetLanguage || 'German',
          onboarding?.nativeLanguage || 'English',
          onboarding?.proficiencyLevel || 'beginner'
        );

      logger.info(`Generated ${steps} assessment steps without audio`);


      const audioSteps =
        await this.assessmentGeneratorService.generateAudioForSteps(
          steps,
          onboarding?.targetLanguage || 'English',
          onboarding?.nativeLanguage || 'English'
        );
      logger.info('generated audio steps', audioSteps);

      // TODO: save audios to the storage and persist the audio urls in the database


      const assessmentLesson = {
        userId,
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
        userId,
        assessmentLesson
      );
    } catch (error) {
      logger.error('Error generating assessment lesson:', error);
      throw new Error('Failed to generate assessment lesson');
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
        assessmentLesson,
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
          maxAttempts: step.maxAttempts 
        });
        
        // Record the attempt but mark as incorrect, preserving user response
        return this.onboardingRepository.recordStepAttempt(
          lessonId,
          stepId,
          {
            userResponse: step.expectedAnswer || '',
            correct: true, // to proceed on the frontend
          }
        );
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

      return updatedStep;
    } catch (error) {
      logger.error('Error recording step attempt:', error);
      throw new Error('Failed to record step attempt');
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

    const fileUri = await this.recordingService.uploadFile(
      buffer,
      sessionRecording.type,
      `lesson-${lesson.id}-${Date.now()}.webm`
    );
    logger.log('File URI:', fileUri);

    // send recording to AI
    let aiResponse: Record<string, unknown>;
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
    const audioMetrics = this.convertAiResponseToAudioMetrics(aiResponse);

    // 4. update lesson with sessionRecordingMetrics, lesson should have a foreign key to audioMetrics
    return this.onboardingRepository.updateOnboardingAssessmentLesson(
      lesson.id,
      { audioMetrics }
    );
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
    const id = crypto.randomUUID();

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
