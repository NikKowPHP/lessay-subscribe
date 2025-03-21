import { OnboardingModel, AssessmentLesson, AssessmentStep } from '@/models/AppAllModels.model'
import { IOnboardingRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { IAuthService } from '@/services/auth.service'
import prisma from '@/lib/prisma'

export class OnboardingRepository implements IOnboardingRepository {
  private authService: IAuthService

  constructor(authService: IAuthService) {
    this.authService = authService
  }

  async getSession() {
    const session = await this.authService.getSession()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }
    return session
  }

  async getOnboarding(): Promise<OnboardingModel | null> {
    try {
      const session = await this.getSession()
      return await prisma.onboarding.findUnique({
        where: { userId: session.user.id }
      })
    } catch (error) {
      logger.error('Error fetching onboarding:', error)
      return null
    }
  }

  async createOnboarding(): Promise<OnboardingModel> {
    try {
      const session = await this.getSession()
      
      // Check if onboarding already exists
      const existingOnboarding = await prisma.onboarding.findUnique({
        where: { userId: session.user.id }
      })

      if (existingOnboarding) {
        return existingOnboarding
      }

      return await prisma.onboarding.create({
        data: {
          userId: session.user.id,
          steps: {},
          completed: false
        }
      })
    } catch (error) {
      logger.error('Error creating onboarding:', error)
      throw error
    }
  }

  async updateOnboarding(step: string): Promise<OnboardingModel> {
    try {
      const session = await this.getSession()
      const onboarding = await prisma.onboarding.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!onboarding) {
        throw new Error('Onboarding not found')
      }

      const steps = onboarding.steps as { [key: string]: boolean }
      steps[step] = true

      return await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: {
          steps: steps
        }
      })
    } catch (error) {
      logger.error('Error updating onboarding:', error)
      throw error
    }
  }

  async completeOnboarding(): Promise<OnboardingModel> {
    try {
      const session = await this.getSession()
      return await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: { completed: true, createdAt: new Date(), updatedAt: new Date(), initialAssessmentCompleted: true }
      })
    } catch (error) {
      logger.error('Error completing onboarding:', error)
      throw error
    }
  }

  async deleteOnboarding(): Promise<void> {
    try {
      const session = await this.getSession()
      await prisma.onboarding.delete({
        where: { userId: session.user.id }
      })
    } catch (error) {
      logger.error('Error deleting onboarding:', error)
      throw error
    }
  }

  async getStatus(): Promise<boolean> {
    const onboarding = await this.getOnboarding()
    return onboarding?.completed ?? false
  }

  async getUserAssessment(): Promise<AssessmentLesson | null> {
    try {
      const session = await this.getSession()
      return await prisma.assessmentLesson.findFirst({
        where: {
          userId: session.user.id,
          completed: false
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error fetching user assessment:', error)
      throw error
    }
  }

  async getAssessmentLessons(userId: string): Promise<AssessmentLesson[]> {
    try {
      // Validate the user has permission to access this data
      const session = await this.getSession()
      if (session.user.id !== userId) {
        throw new Error('Unauthorized access to assessment lessons')
      }
      
      return await prisma.assessmentLesson.findMany({
        where: { userId },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error fetching assessment lessons:', error)
      return []
    }
  }

  async completeAssessmentLesson(lessonId: string, userResponse: string): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      
      // First verify the assessment exists and belongs to this user
      const assessment = await prisma.assessmentLesson.findFirst({
        where: { 
          id: lessonId,
          userId: session.user.id
        }
      })
      
      if (!assessment) {
        throw new Error('Assessment lesson not found or unauthorized')
      }
      
      // Mark the assessment as completed
      return await prisma.assessmentLesson.update({
        where: { id: lessonId },
        data: {
          completed: true,
          summary: userResponse, // Store the user's response as the summary
          updatedAt: new Date()
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error completing assessment lesson:', error)
      throw error
    }
  }

  async createUserAssessment(sourceLanguage: string, targetLanguage: string): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      
      // Check if assessment already exists
      const existingAssessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id },
        include: {
          steps: true
        }
      })

      if (existingAssessment) {
        return existingAssessment
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
            weaknesses: []
          },
          proposedTopics: [],
          steps: {
            create: [] // Steps will be added separately
          }
        },
        include: {
          steps: true
        }
      })
    } catch (error) {
      logger.error('Error creating user assessment:', error)
      throw error
    }
  }

  async getAssessmentById(id: string): Promise<AssessmentLesson | null> {
    try {
      return await prisma.assessmentLesson.findUnique({
        where: { id },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error(`Error fetching assessment with id ${id}:`, error)
      throw error
    }
  }

  async completeAssessment(): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      const result = await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          completed: true
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
      
      // Also update onboarding to mark assessment as completed
      await prisma.onboarding.update({
        where: { userId: session.user.id },
        data: {
          initialAssessmentCompleted: true
        }
      })
      
      return result
    } catch (error) {
      logger.error('Error completing assessment:', error)
      throw error
    }
  }

  async completeAssessmentStep(
    stepId: string, 
    userResponse: string, 
    correct: boolean
  ): Promise<AssessmentStep> {
    try {
      const step = await prisma.assessmentStep.findUnique({
        where: { id: stepId }
      })
      
      if (!step) {
        throw new Error('Assessment step not found')
      }
      
      return await prisma.assessmentStep.update({
        where: { id: stepId },
        data: {
          userResponse,
          attempts: { increment: 1 },
          correct,
          lastAttemptAt: new Date()
        }
      })
    } catch (error) {
      logger.error('Error completing assessment step:', error)
      throw error
    }
  }

  async updateAssessmentMetrics(
    metrics: {
      accuracy?: number;
      pronunciationScore?: number;
      grammarScore?: number;
      vocabularyScore?: number;
      overallScore?: number;
      strengths?: string[];
      weaknesses?: string[];
    }
  ): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          metrics
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error updating assessment metrics:', error)
      throw error
    }
  }

  async updateProposedTopics(topics: string[]): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          proposedTopics: topics
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error updating proposed topics:', error)
      throw error
    }
  }

  async updateAssessmentSummary(summary: string): Promise<AssessmentLesson> {
    try {
      const session = await this.getSession()
      return await prisma.assessmentLesson.update({
        where: { userId: session.user.id },
        data: {
          summary
        },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            }
          }
        }
      })
    } catch (error) {
      logger.error('Error updating assessment summary:', error)
      throw error
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
      const session = await this.getSession()
      const assessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!assessment) {
        throw new Error('Assessment not found')
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
          correct: false
        }
      })
    } catch (error) {
      logger.error('Error adding assessment step:', error)
      throw error
    }
  }

  async updateStepFeedback(stepId: string, feedback: string): Promise<AssessmentStep> {
    try {
      return await prisma.assessmentStep.update({
        where: { id: stepId },
        data: {
          feedback
        }
      })
    } catch (error) {
      logger.error('Error updating step feedback:', error)
      throw error
    }
  }

  async getNextIncompleteStep(): Promise<AssessmentStep | null> {
    try {
      const session = await this.getSession()
      const assessment = await prisma.assessmentLesson.findUnique({
        where: { userId: session.user.id },
        include: {
          steps: {
            orderBy: {
              stepNumber: 'asc'
            },
            where: {
              correct: false
            }
          }
        }
      })
      
      if (!assessment || assessment.steps.length === 0) {
        return null
      }
      
      return assessment.steps[0]
    } catch (error) {
      logger.error('Error getting next incomplete step:', error)
      throw error
    }
  }
}
