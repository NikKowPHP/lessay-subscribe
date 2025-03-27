import { OnboardingModel, AssessmentLesson, AssessmentStep } from '@/models/AppAllModels.model';
import { IOnboardingRepository } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import LessonService from './lesson.service';
import LessonGeneratorService from './lesson-generator.service';
import { IAssessmentGeneratorService } from './assessment-step-generator.service';

export default class OnboardingService {
  private onboardingRepository: IOnboardingRepository;
  private lessonService: LessonService;
  private assessmentGeneratorService: IAssessmentGeneratorService;
  constructor(
    onboardingRepository: IOnboardingRepository,
    lessonService: LessonService,
    assessmentGeneratorService: IAssessmentGeneratorService
  ) {
    this.onboardingRepository = onboardingRepository;
    this.lessonService = lessonService;
    this.assessmentGeneratorService = assessmentGeneratorService;
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

  completeOnboarding = async (): Promise<OnboardingModel> => {
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

      logger.info(`Generated ${steps} assessment steps`);

      // Construct complete assessment lesson object
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
        steps: steps,
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
      await this.onboardingRepository.getAssessmentLesson(lessonId);
    if (!assessmentLesson) {
      throw new Error('Assessment lesson not found');
    }

    const results =
      await this.assessmentGeneratorService.generateAssessmentResult(
        assessmentLesson,
        userResponse
      );

    assessmentLesson.metrics = results.metrics;
    assessmentLesson.summary = results.summary;
    assessmentLesson.proposedTopics = results.proposedTopics;

    logger.info(`Assessment lesson: ${JSON.stringify(assessmentLesson)}`);

    // complete assessment lesson
    return await this.onboardingRepository.completeAssessmentLesson(
      assessmentLesson,
      userResponse
    );
  }


  async recordStepAttempt(
    lessonId: string,
    stepId: string,
    userResponse: string
  ): Promise<AssessmentStep> {

    try {
      const lesson = await this.onboardingRepository.getAssessmentLesson(
        lessonId
      );
      if (!lesson) {
        throw new Error('Assessment lesson not found');
      }
      const step = lesson.steps.find((s) => s.id === stepId);
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
      }
      let correct = false;

      logger.info('processing the step attempt', { step, userResponse });

      // Handle different assessment step types
      switch (step.type) {
        case 'question':
          // For questions, compare with the expectedAnswer if available
          if (step.expectedAnswer) {
            correct =
              userResponse.trim().toLowerCase() ===
              step.expectedAnswer.trim().toLowerCase();
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

        case 'user_response':
          // For user_response types, generally considered correct with any valid response
          correct = true;
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
}
