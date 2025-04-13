import { ILessonRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { LessonModel, LessonStep  } from '@/models/AppAllModels.model'
import prisma from '@/lib/prisma'
import { IAuthService } from '@/services/supabase-auth.service'

export class LessonRepository implements ILessonRepository {
  private authService: IAuthService

  constructor(authService: IAuthService) {
    this.authService = authService
  }
  
  private async validateUser() {
    const session = await this.authService.getSession();
    if (!session?.user?.id) {
      throw new Error('Authentication required');
    }
    return session.user.id;
  }


  async getLessons(): Promise<LessonModel[]> {
    try {
      const userId = await this.validateUser();
      return await prisma.lesson.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { steps: true }
      })
    } catch (error) {
      logger.error('Error fetching lessons:', error)
      throw error
    }
  }

  async getLessonById(lessonId: string): Promise<LessonModel | null> {
    try {
      const userId = await this.validateUser();
      return await prisma.lesson.findUnique({
        where: { 
          id: lessonId,
          userId
        },
        include: { steps: true }
      })
    } catch (error) {
      logger.error('Error fetching lesson:', error)
      return null
    }
  }

  async createLesson(lessonData: {
    focusArea: string
    targetSkills: string[]
    steps: LessonStep[]
  }): Promise<LessonModel> {
    try {
      const userId = await this.validateUser();
      return await prisma.lesson.create({
        data: {
          userId,
          lessonId: `lesson-${Date.now()}`,
          focusArea: lessonData.focusArea,
          targetSkills: lessonData.targetSkills,
          steps: {
            create: lessonData.steps.map(step => ({
              stepNumber: step.stepNumber,
              type: step.type,
              content: step.content,
              translation: step.translation,
              attempts: step.attempts || 0,
              correct: step.correct || false,
              errorPatterns: step.errorPatterns || [],
              expectedAnswer: step.expectedAnswer || null,
              expectedAnswerAudioUrl: step.expectedAnswerAudioUrl || null,
              contentAudioUrl: step.contentAudioUrl || null
            }))
          },
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          steps: true
        }
      })
    } catch (error) {
      logger.error('Error creating lesson:', error)
      throw error
    }
  }

  async updateLesson(lessonId: string, lessonData: Partial<LessonModel>): Promise<LessonModel> {
    try {
      const userId = await this.validateUser();
      
      // Remove related fields from direct spread to handle them properly
      const { steps, audioMetrics, ...otherData } = lessonData
      
      // Prepare data object for update
      const data: any = {
        ...otherData,
        performanceMetrics: otherData.performanceMetrics ? 
          JSON.parse(JSON.stringify(otherData.performanceMetrics)) : 
          undefined,
      }
      
      // Handle steps relationship if provided
      if (steps) {
        data.steps = {
          deleteMany: {}, // Delete existing steps
          create: steps.map(step => ({
            stepNumber: step.stepNumber,
            type: step.type,
            content: step.content,
            translation: step.translation,
            attempts: step.attempts || 0,
            correct: step.correct || false,
            errorPatterns: step.errorPatterns || [],
            expectedAnswer: step.expectedAnswer || null,
            expectedAnswerAudioUrl: step.expectedAnswerAudioUrl || null,
            contentAudioUrl: step.contentAudioUrl || null
          }))
        }
      }
      
      // Handle audioMetrics relationship if provided
      if (audioMetrics) {
        data.audioMetrics = {
          upsert: {
            create: {
              // Required fields for creating new audio metrics
              pronunciationScore: audioMetrics.pronunciationScore,
              fluencyScore: audioMetrics.fluencyScore,
              grammarScore: audioMetrics.grammarScore,
              vocabularyScore: audioMetrics.vocabularyScore,
              overallPerformance: audioMetrics.overallPerformance,
              proficiencyLevel: audioMetrics.proficiencyLevel,
              learningTrajectory: audioMetrics.learningTrajectory,
              pronunciationAssessment: audioMetrics.pronunciationAssessment,
              fluencyAssessment: audioMetrics.fluencyAssessment,
              grammarAssessment: audioMetrics.grammarAssessment,
              vocabularyAssessment: audioMetrics.vocabularyAssessment,
              exerciseCompletion: audioMetrics.exerciseCompletion,
              suggestedTopics: audioMetrics.suggestedTopics,
              grammarFocusAreas: audioMetrics.grammarFocusAreas,
              vocabularyDomains: audioMetrics.vocabularyDomains,
              nextSkillTargets: audioMetrics.nextSkillTargets,
              preferredPatterns: audioMetrics.preferredPatterns,
              effectiveApproaches: audioMetrics.effectiveApproaches
            },
            update: {
              // Fields to update if audio metrics already exist
              pronunciationScore: audioMetrics.pronunciationScore,
              fluencyScore: audioMetrics.fluencyScore,
              grammarScore: audioMetrics.grammarScore,
              vocabularyScore: audioMetrics.vocabularyScore,
              overallPerformance: audioMetrics.overallPerformance,
              proficiencyLevel: audioMetrics.proficiencyLevel,
              learningTrajectory: audioMetrics.learningTrajectory,
              pronunciationAssessment: audioMetrics.pronunciationAssessment,
              fluencyAssessment: audioMetrics.fluencyAssessment,
              grammarAssessment: audioMetrics.grammarAssessment,
              vocabularyAssessment: audioMetrics.vocabularyAssessment,
              exerciseCompletion: audioMetrics.exerciseCompletion,
              suggestedTopics: audioMetrics.suggestedTopics,
              grammarFocusAreas: audioMetrics.grammarFocusAreas,
              vocabularyDomains: audioMetrics.vocabularyDomains,
              nextSkillTargets: audioMetrics.nextSkillTargets,
              preferredPatterns: audioMetrics.preferredPatterns,
              effectiveApproaches: audioMetrics.effectiveApproaches
            }
          }
        }
      }
      
      const updatedLesson = await prisma.lesson.update({
        where: { 
          id: lessonId,
          userId
        },
        data: data,
        include: { steps: true, audioMetrics: true }
      })
      
      return updatedLesson as LessonModel
    } catch (error) {
      logger.error('Error updating lesson:', error)
      throw error
    }
  }

  async completeLesson(lessonId: string, performanceMetrics?: {
    accuracy?: number
    pronunciationScore?: number
    errorPatterns?: string[]
  }): Promise<LessonModel> {
    try {
      const userId = await this.validateUser();
      return await prisma.lesson.update({
        where: { 
          id: lessonId,
          userId
        },
        data: { 
          completed: true,
          performanceMetrics
        },
        include: { steps: true }
      })
    } catch (error) {
      logger.error('Error completing lesson:', error)
      throw error
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    try {
      const userId = await this.validateUser();
      await prisma.lesson.delete({
        where: { 
          id: lessonId,
          userId
        }
      })
    } catch (error) {
      logger.error('Error deleting lesson:', error)
      throw error
    }
  }

  async getStepHistory(lessonId: string, stepId: string): Promise<LessonStep[]> {
    return prisma.lessonStep.findMany({
      where: { lessonId, stepNumber: parseInt(stepId) }
    })
  }

  async recordStepAttempt(lessonId: string, stepId: string, data: {
    userResponse: string
    correct: boolean
  }): Promise<LessonStep> {
    // Convert stepId to number and find by stepNumber
    const stepNumber = parseInt(stepId)
    
    // First get the existing step to validate existence
    const existingStep = await prisma.lessonStep.findFirst({
      where: { 
        lessonId,
        id: stepId,
      }
    })

    if (!existingStep) {
      throw new Error(`Step ${stepNumber} not found in lesson ${lessonId}`)
    }
    logger.info('existingStep in repo', { existingStep })
    // 2. Get existing response history
    let responseHistory: string[] = [];
    try {
      responseHistory = existingStep.userResponseHistory
        ? JSON.parse(existingStep.userResponseHistory as string)
        : [];
    } catch (e) {
      logger.error('Error parsing response history', { error: e });
      responseHistory = [];
    }
    responseHistory.push(data.userResponse);
    // Update using the database ID from existing step
    return prisma.lessonStep.update({
      where: { 
        id: existingStep.id,
        lessonId 
      },
      data: {
        attempts: { increment: 1 },
        userResponse: data.userResponse,
        userResponseHistory: JSON.stringify(responseHistory),
        correct: data.correct,
        lastAttemptAt: new Date()
      }
    })
  }
}