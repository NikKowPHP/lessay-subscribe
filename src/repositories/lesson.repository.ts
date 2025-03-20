import { IAuthService } from '@/services/auth.service'
import { ILessonRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { LessonModel, LessonStep, OnboardingModel } from '@/models/AppAllModels.model'
import prisma from '@/lib/prisma'

export class LessonRepository implements ILessonRepository {
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

  async getLessons(): Promise<LessonModel[]> {
    try {
      const session = await this.getSession()
      return await prisma.lesson.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      })
    } catch (error) {
      logger.error('Error fetching lessons:', error)
      throw error
    }
  }

  async getLessonById(lessonId: string): Promise<LessonModel | null> {
    try {
      const session = await this.getSession()
      return await prisma.lesson.findUnique({
        where: { 
          id: lessonId,
          userId: session.user.id
        }
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
      const session = await this.getSession()
      return await prisma.lesson.create({
        data: {
          userId: session.user.id,
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
              errorPatterns: step.errorPatterns || []
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
      const session = await this.getSession()
      const data = {
        ...lessonData,
        performanceMetrics: lessonData.performanceMetrics ? 
          JSON.parse(JSON.stringify(lessonData.performanceMetrics)) : 
          undefined
      }
      return await prisma.lesson.update({
        where: { 
          id: lessonId,
          userId: session.user.id
        },
        data: data
      })
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
      const session = await this.getSession()
      return await prisma.lesson.update({
        where: { 
          id: lessonId,
          userId: session.user.id
        },
        data: { 
          completed: true,
          performanceMetrics
        }
      })
    } catch (error) {
      logger.error('Error completing lesson:', error)
      throw error
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    try {
      const session = await this.getSession()
      await prisma.lesson.delete({
        where: { 
          id: lessonId,
          userId: session.user.id
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
    errorPatterns?: string[]
  }): Promise<LessonStep> {
    
    return prisma.lessonStep.update({
      where: { id: stepId, lessonId },
      data: {
        attempts: { increment: 1 },
        userResponse: data.userResponse,
        correct: data.correct,
        errorPatterns: data.errorPatterns,
        lastAttemptAt: new Date()
      }
    });
  }

  
}