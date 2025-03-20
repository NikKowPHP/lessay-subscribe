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
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
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

  
  
  private getLessonTemplatesForProficiency(
    targetLanguage: string, 
    proficiencyLevel: string,
    learningPurpose: string
  ) {
    // Basic lesson templates based on proficiency and purpose
    const templates = []
    
    if (proficiencyLevel === 'beginner') {
      templates.push({
        focusArea: `Basic ${targetLanguage} Greetings`,
        targetSkills: ['Speaking', 'Listening', 'Vocabulary'],
        difficultyLevel: 'beginner',
        estimatedTimeMinutes: 10,
        sequence: [
          {
            type: 'instruction',
            content: `Learn basic greetings in ${targetLanguage}`
          },
          {
            type: 'vocabulary',
            content: 'Hello, Goodbye, Thank you, Please, Yes, No'
          },
          {
            type: 'practice',
            content: `Practice saying these words in ${targetLanguage}`
          }
        ]
      })
      
      templates.push({
        focusArea: `${targetLanguage} Numbers 1-10`,
        targetSkills: ['Vocabulary', 'Pronunciation'],
        difficultyLevel: 'beginner',
        estimatedTimeMinutes: 15,
        sequence: [
          {
            type: 'instruction',
            content: `Learn to count from 1 to 10 in ${targetLanguage}`
          },
          {
            type: 'vocabulary',
            content: 'Numbers 1 through 10'
          },
          {
            type: 'practice',
            content: 'Practice saying these numbers'
          }
        ]
      })
    }
    
    if (proficiencyLevel === 'intermediate') {
      templates.push({
        focusArea: `${targetLanguage} Conversation Skills`,
        targetSkills: ['Speaking', 'Listening', 'Grammar'],
        difficultyLevel: 'intermediate',
        estimatedTimeMinutes: 20,
        sequence: [
          {
            type: 'instruction',
            content: `Build conversation skills in ${targetLanguage}`
          },
          {
            type: 'dialogue',
            content: 'Sample dialogue for everyday situations'
          },
          {
            type: 'practice',
            content: 'Practice this dialogue with different variations'
          }
        ]
      })
    }
    
    if (proficiencyLevel === 'advanced') {
      templates.push({
        focusArea: `Advanced ${targetLanguage} Expression`,
        targetSkills: ['Speaking', 'Comprehension', 'Cultural Context'],
        difficultyLevel: 'advanced',
        estimatedTimeMinutes: 25,
        sequence: [
          {
            type: 'instruction',
            content: `Master advanced expressions in ${targetLanguage}`
          },
          {
            type: 'vocabulary',
            content: 'Idiomatic expressions and cultural references'
          },
          {
            type: 'practice',
            content: 'Practice using these expressions in context'
          }
        ]
      })
    }
    
    // Add purpose-specific lessons
    if (learningPurpose === 'travel') {
      templates.push({
        focusArea: `${targetLanguage} for Travelers`,
        targetSkills: ['Speaking', 'Listening', 'Cultural Awareness'],
        difficultyLevel: proficiencyLevel,
        estimatedTimeMinutes: 15,
        sequence: [
          {
            type: 'instruction',
            content: `Essential ${targetLanguage} phrases for travel`
          },
          {
            type: 'vocabulary',
            content: 'Airport, Hotel, Restaurant, Directions'
          },
          {
            type: 'practice',
            content: 'Practice these travel situations'
          }
        ]
      })
    }
    
    if (learningPurpose === 'business') {
      templates.push({
        focusArea: `${targetLanguage} for Business`,
        targetSkills: ['Speaking', 'Vocabulary', 'Formal Language'],
        difficultyLevel: proficiencyLevel,
        estimatedTimeMinutes: 20,
        sequence: [
          {
            type: 'instruction',
            content: `Business ${targetLanguage} essentials`
          },
          {
            type: 'vocabulary',
            content: 'Meeting, Negotiation, Presentation terms'
          },
          {
            type: 'practice',
            content: 'Practice business scenarios'
          }
        ]
      })
    }
    
    return templates
  }
}