import { PrismaClient } from '@prisma/client'
import { IAuthService } from '@/services/auth.service'
import { ILessonRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
const prisma = new PrismaClient()

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
    sequence: LessonStep[]
  }): Promise<LessonModel> {
    try {
      const session = await this.getSession()
      return await prisma.lesson.create({
        data: {
          userId: session.user.id,
          lessonId: `lesson-${Date.now()}`,
          focusArea: lessonData.focusArea,
          targetSkills: lessonData.targetSkills,
          sequence: JSON.parse(JSON.stringify(lessonData.sequence)),
          completed: false
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
        sequence: lessonData.sequence ? JSON.parse(JSON.stringify(lessonData.sequence)) : undefined,
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
}