import {
  OnboardingModel,
  AssessmentLesson,
  AssessmentStep,
  AudioMetrics,
  PronunciationAssessment,
  FluencyAssessment,
  GrammarAssessment,
  VocabularyAssessment,
  ExerciseCompletion,
} from '@/models/AppAllModels.model';
import { IOnboardingRepository } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import { IAuthService } from '@/services/auth.service';
import prisma from '@/lib/prisma';
import { JsonValue } from 'type-fest';
import { PrismaClient, Prisma } from '@prisma/client';

export class OnboardingRepository implements IOnboardingRepository {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
  }

  async getSession() {
    const session = await this.authService.getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    return session;
  }

  async getOnboarding(): Promise<OnboardingModel | null> {
    try {
      const session = await this.getSession();
      return await prisma.onboarding.findUnique({
        where: { userId: session.user.id },
      });
    } catch (error) {
      logger.error('Error fetching onboarding:', error);
      return null;
    }
  }

  async createOnboarding(): Promise<OnboardingModel> {
    try {
      const session = await this.getSession();

      // Check if onboarding already exists
      const existingOnboarding = await prisma.onboarding.findUnique({
        where: { userId: session.user.id },
      });

      if (existingOnboarding) {
        return existingOnboarding;
      }

      return await prisma.onboarding.create({
        data: {
          userId: session.user.id,
          steps: {},
          completed: false,
        },
      });
    } catch (error) {
      logger.error('Error creating onboarding:', error);
      throw error;
    }
  }

  async updateOnboarding(step: string): Promise<OnboardingModel> {
    try {
      const session = await this.getSession();
      const onboarding = await prisma.onboarding.findUnique({
        where: { userId: session.user.id },
      });

      if (!onboarding) {
        throw new Error('Onboarding not found');
      }

      const steps = onboarding.steps as { [key: string]: boolean };
      steps[step] = true;

      return await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: {
          steps: steps,
        },
      });
    } catch (error) {
      logger.error('Error updating onboarding:', error);
      throw error;
    }
  }

  async completeOnboarding(): Promise<OnboardingModel> {
    try {
      const session = await this.getSession();
      return await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: {
          completed: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          initialAssessmentCompleted: true,
        },
      });
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      throw error;
    }
  }

  async deleteOnboarding(): Promise<void> {
    try {
      const session = await this.getSession();
      await prisma.onboarding.delete({
        where: { userId: session.user.id },
      });
    } catch (error) {
      logger.error('Error deleting onboarding:', error);
      throw error;
    }
  }

  async getStatus(): Promise<boolean> {
    const onboarding = await this.getOnboarding();
    return onboarding?.completed ?? false;
  }

  async getUserAssessment(): Promise<AssessmentLesson | null> {
    try {
      const session = await this.getSession();
      return await prisma.assessmentLesson.findFirst({
        where: {
          userId: session.user.id,
          completed: false,
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching user assessment:', error);
      throw error;
    }
  }

  async getAssessmentLesson(userId: string): Promise<AssessmentLesson | null> {
    try {
      // Validate the user has permission to access this data
      const session = await this.getSession();
      if (!session.user.id) {
        throw new Error('Unauthorized');
      }

      return await prisma.assessmentLesson.findUnique({
        where: { userId },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching assessment lessons:', error);
      return null;
    }
  }
  async getAssessmentLessonById(
    lessonId: string
  ): Promise<AssessmentLesson | null> {
    try {
      // Validate the user has permission to access this data
      const session = await this.getSession();
      if (!session.user.id) {
        throw new Error('Unauthorized');
      }

      return await prisma.assessmentLesson.findUnique({
        where: { id: lessonId },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching assessment lessons:', error);
      return null;
    }
  }

  async completeAssessmentLesson(
    assessment: AssessmentLesson,
    data: {
      summary: string;
      metrics: any;
      proposedTopics: string[];
    }
  ): Promise<AssessmentLesson> {
    try {
      if (!assessment) {
        throw new Error('Assessment lesson not found or unauthorized');
      }

      // Mark the assessment as completed
      return await prisma.assessmentLesson.update({
        where: { id: assessment.id },
        data: {
          completed: true,
          summary: data.summary,
          metrics: data.metrics,
          proposedTopics: data.proposedTopics,
          updatedAt: new Date(),
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error completing assessment lesson:', error);
      throw error;
    }
  }

  async createUserAssessment(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();

      // Check if assessment already exists
      const existingAssessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id },
        include: {
          steps: true,
        },
      });

      if (existingAssessment) {
        return existingAssessment;
      }

      // Create new assessment
      return await prisma.assessmentLesson.create({
        data: {
          userId: session.user.id,
          description: `${targetLanguage} language assessment`,
          completed: false,
          sourceLanguage,
          targetLanguage,
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
          steps: {
            create: [], // Steps will be added separately
          },
        },
        include: {
          steps: true,
        },
      });
    } catch (error) {
      logger.error('Error creating user assessment:', error);
      throw error;
    }
  }

  async createAssessmentLesson(
    userId: string,
    assessment: Omit<AssessmentLesson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AssessmentLesson> {
    try {
      // First create the assessment lesson
      const createdAssessment = await prisma.assessmentLesson.create({
        data: {
          userId,
          description: assessment.description,
          completed: assessment.completed,
          sourceLanguage: assessment.sourceLanguage,
          targetLanguage: assessment.targetLanguage,
          metrics: assessment.metrics as any, // Type cast to handle Prisma JSON type
          proposedTopics: assessment.proposedTopics,
          summary: assessment.summary,
        },
      });

      // Then create all the steps associated with it
      const createdSteps = await Promise.all(
        assessment.steps.map((step) =>
          prisma.assessmentStep.create({
            data: {
              assessmentId: createdAssessment.id,
              stepNumber: step.stepNumber,
              type: step.type,
              content: step.content,
              contentAudioUrl: step.contentAudioUrl,
              translation: step.translation,
              expectedAnswer: step.expectedAnswer,
              expectedAnswerAudioUrl: step.expectedAnswerAudioUrl,
              maxAttempts: step.maxAttempts || 3,
              attempts: step.attempts || 0,
              correct: step.correct || false,
              feedback: step.feedback,
            },
          })
        )
      );

      // Return the assessment with its steps
      return {
        ...createdAssessment,
        steps: createdSteps,
      };
    } catch (error) {
      logger.error('Error creating assessment lesson:', error);
      throw error;
    }
  }

  async getAssessmentById(id: string): Promise<AssessmentLesson | null> {
    try {
      return await prisma.assessmentLesson.findUnique({
        where: { id },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error(`Error fetching assessment with id ${id}:`, error);
      throw error;
    }
  }

  async completeAssessment(): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();
      const result = await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          completed: true,
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      // Also update onboarding to mark assessment as completed
      await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: {
          initialAssessmentCompleted: true,
        },
      });

      return result;
    } catch (error) {
      logger.error('Error completing assessment:', error);
      throw error;
    }
  }

  async completeAssessmentStep(
    stepId: string,
    userResponse: string,
    correct: boolean
  ): Promise<AssessmentStep> {
    try {
      const step = await prisma.assessmentStep.findUnique({
        where: { id: stepId },
      });

      if (!step) {
        throw new Error('Assessment step not found');
      }

      return await prisma.assessmentStep.update({
        where: { id: stepId },
        data: {
          userResponse,
          attempts: { increment: 1 },
          correct,
          lastAttemptAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error completing assessment step:', error);
      throw error;
    }
  }

  async updateAssessmentMetrics(metrics: {
    accuracy?: number;
    pronunciationScore?: number;
    grammarScore?: number;
    vocabularyScore?: number;
    overallScore?: number;
    strengths?: string[];
    weaknesses?: string[];
  }): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          metrics,
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating assessment metrics:', error);
      throw error;
    }
  }

  async updateProposedTopics(topics: string[]): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          proposedTopics: topics,
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating proposed topics:', error);
      throw error;
    }
  }

  async updateAssessmentSummary(summary: string): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          summary,
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating assessment summary:', error);
      throw error;
    }
  }

  async addAssessmentStep(step: {
    stepNumber: number;
    type: any; // Using any for simplicity, but should match AssessmentStepType
    content: string;
    contentAudioUrl?: string;
    translation?: string;
    expectedAnswer?: string;
    expectedAnswerAudioUrl?: string;
    maxAttempts?: number;
    feedback?: string;
  }): Promise<AssessmentStep> {
    try {
      const session = await this.getSession();
      const assessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      return await prisma.assessmentStep.create({
        data: {
          assessmentId: assessment.id,
          stepNumber: step.stepNumber,
          type: step.type,
          content: step.content,
          contentAudioUrl: step.contentAudioUrl,
          translation: step.translation,
          expectedAnswer: step.expectedAnswer,
          expectedAnswerAudioUrl: step.expectedAnswerAudioUrl,
          maxAttempts: step.maxAttempts || 3,
          feedback: step.feedback,
          attempts: 0,
          correct: false,
        },
      });
    } catch (error) {
      logger.error('Error adding assessment step:', error);
      throw error;
    }
  }

  async updateStepFeedback(
    stepId: string,
    feedback: string
  ): Promise<AssessmentStep> {
    try {
      return await prisma.assessmentStep.update({
        where: { id: stepId },
        data: {
          feedback,
        },
      });
    } catch (error) {
      logger.error('Error updating step feedback:', error);
      throw error;
    }
  }

  async getNextIncompleteStep(): Promise<AssessmentStep | null> {
    try {
      const session = await this.getSession();
      const assessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
            where: {
              correct: false,
            },
          },
        },
      });

      if (!assessment || assessment.steps.length === 0) {
        return null;
      }

      return assessment.steps[0];
    } catch (error) {
      logger.error('Error getting next incomplete step:', error);
      throw error;
    }
  }

  async recordStepAttempt(
    lessonId: string,
    stepId: string,
    data: {
      userResponse: string;
      correct: boolean;
    }
  ): Promise<AssessmentStep> {
    try {
      const session = await this.getSession();

      // First verify this assessment belongs to the current user
      const assessment = await prisma.assessmentLesson.findFirst({
        where: {
          id: lessonId,
          userId: session.user.id,
        },
        include: {
          steps: true,
        },
      });

      if (!assessment) {
        throw new Error('Assessment lesson not found or unauthorized');
      }

      // Find the step
      const step = assessment.steps.find((s) => s.id === stepId);
      if (!step) {
        throw new Error('Step not found in the assessment');
      }
      logger.info('existingStep in repo', { step })
      // 2. Get existing response history
      let responseHistory: string[] = [];
      try {
        responseHistory = step.userResponseHistory
          ? JSON.parse(step.userResponseHistory as string)
          : [];
      } catch (e) {
        logger.error('Error parsing response history', { error: e });
        responseHistory = [];
      }
      responseHistory.push(data.userResponse);

      // Update the step with the attempt data
      return await prisma.assessmentStep.update({
        where: { id: stepId },
        data: {
          userResponse: data.userResponse,
          userResponseHistory: JSON.stringify(responseHistory),
          attempts: { increment: 1 },
          correct: data.correct,
          lastAttemptAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error recording assessment step attempt:', error);
      throw error;
    }
  }

  async updateOnboardingAssessmentLesson(lessonId: string, lessonData: Partial<AssessmentLesson>): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession();

      // First verify this assessment belongs to the current user
      const assessment = await prisma.assessmentLesson.findUnique({
        where: { id: lessonId },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
          audioMetrics: true
        },
      });

      if (!assessment) {
        throw new Error('Assessment lesson not found');
      }

      if (assessment.userId !== session.user.id) {
        throw new Error('Unauthorized: You cannot update this assessment');
      }

      // Extract the data to update
      const dataToUpdate: any = {};
      
      // Only include fields that are allowed to be updated
      if (lessonData.completed !== undefined) dataToUpdate.completed = lessonData.completed;
      if (lessonData.description !== undefined) dataToUpdate.description = lessonData.description;
      if (lessonData.sourceLanguage !== undefined) dataToUpdate.sourceLanguage = lessonData.sourceLanguage;
      if (lessonData.targetLanguage !== undefined) dataToUpdate.targetLanguage = lessonData.targetLanguage;
      if (lessonData.metrics !== undefined) dataToUpdate.metrics = lessonData.metrics;
      if (lessonData.proposedTopics !== undefined) dataToUpdate.proposedTopics = lessonData.proposedTopics;
      if (lessonData.summary !== undefined) dataToUpdate.summary = lessonData.summary;
      if (lessonData.sessionRecordingUrl !== undefined) dataToUpdate.sessionRecordingUrl = lessonData.sessionRecordingUrl;

      // Handle audio metrics separately if included in the update
      if (lessonData.audioMetrics) {
        await this.updateAssessmentAudioMetrics(lessonId, assessment.audioMetrics, lessonData.audioMetrics);
      }

      // Update the assessment lesson
      const updatedAssessment = await prisma.assessmentLesson.update({
        where: { id: lessonId },
        data: dataToUpdate,
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
          audioMetrics: true
        },
      });
      
      // Transform to application model
      return this.mapPrismaAssessmentToAppModel(updatedAssessment);
    } catch (error) {
      logger.error('Error updating assessment lesson:', error);
      throw error;
    }
  }

  /**
   * Update or create audio metrics for an assessment lesson
   */
  private async updateAssessmentAudioMetrics(
    lessonId: string, 
    existingMetrics: any | null,
    newMetrics: AudioMetrics
  ): Promise<void> {
    try {
      // Create data object for Prisma with proper JSON handling
      const metricsData = {
        pronunciationScore: newMetrics.pronunciationScore,
        fluencyScore: newMetrics.fluencyScore,
        grammarScore: newMetrics.grammarScore,
        vocabularyScore: newMetrics.vocabularyScore,
        overallPerformance: newMetrics.overallPerformance,
        proficiencyLevel: newMetrics.proficiencyLevel,
        learningTrajectory: newMetrics.learningTrajectory,
        // Convert complex objects to JSON for storage
        pronunciationAssessment: newMetrics.pronunciationAssessment as unknown as Prisma.InputJsonValue,
        fluencyAssessment: newMetrics.fluencyAssessment as unknown as Prisma.InputJsonValue,
        grammarAssessment: newMetrics.grammarAssessment as unknown as Prisma.InputJsonValue,
        vocabularyAssessment: newMetrics.vocabularyAssessment as unknown as Prisma.InputJsonValue,
        exerciseCompletion: newMetrics.exerciseCompletion as unknown as Prisma.InputJsonValue,
        // Arrays
        suggestedTopics: newMetrics.suggestedTopics,
        grammarFocusAreas: newMetrics.grammarFocusAreas,
        vocabularyDomains: newMetrics.vocabularyDomains,
        nextSkillTargets: newMetrics.nextSkillTargets,
        preferredPatterns: newMetrics.preferredPatterns,
        effectiveApproaches: newMetrics.effectiveApproaches,
        // Optional fields
        audioRecordingUrl: newMetrics.audioRecordingUrl,
        recordingDuration: newMetrics.recordingDuration,
      };

      // If audio metrics already exist, update them
      if (existingMetrics) {
        await prisma.audioMetrics.update({
          where: { id: existingMetrics.id },
          data: metricsData
        });
      } 
      // If audio metrics don't exist, create them
      else {
        await prisma.audioMetrics.create({
          data: {
            ...metricsData,
            // Link to the assessment lesson
            assessmentLesson: {
              connect: { id: lessonId }
            }
          }
        });
      }
    } catch (error) {
      logger.error('Error updating audio metrics:', error);
      throw error;
    }
  }

  /**
   * Maps Prisma assessment model to application model with proper type handling
   */
  private mapPrismaAssessmentToAppModel(assessment: any): AssessmentLesson {
    // Handle the case where audioMetrics is null
    let audioMetricsModel = null;
    
    if (assessment.audioMetrics) {
      // Transform JSON fields to their typed counterparts
      audioMetricsModel = {
        ...assessment.audioMetrics,
        // Type cast JSON fields to their strongly-typed interfaces
        pronunciationAssessment: assessment.audioMetrics.pronunciationAssessment as unknown as PronunciationAssessment,
        fluencyAssessment: assessment.audioMetrics.fluencyAssessment as unknown as FluencyAssessment,
        grammarAssessment: assessment.audioMetrics.grammarAssessment as unknown as GrammarAssessment,
        vocabularyAssessment: assessment.audioMetrics.vocabularyAssessment as unknown as VocabularyAssessment,
        exerciseCompletion: assessment.audioMetrics.exerciseCompletion as unknown as ExerciseCompletion,
      };
    }
    
    // Return the properly typed model
    return {
      ...assessment,
      audioMetrics: audioMetricsModel,
    } as AssessmentLesson;  // Explicitly cast the entire result
  }
}
