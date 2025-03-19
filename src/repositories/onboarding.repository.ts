import { PrismaClient } from '@prisma/client'
import { OnboardingModel, AssessmentLesson } from '@/models/AppAllModels.model'
import IOnboardingRepository from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { IAuthService } from '@/services/auth.service'

const prisma = new PrismaClient()

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

  private async getUserIdFromSupabase(supabaseId: string): Promise<number> {
    // For development with the mock service, we'll hardcode this mapping
    if (supabaseId === 'mock-user-id') {
      return 1;
    }
    
    // In production, you'd implement a proper mapping here
    // For example, you might have a separate table that maps Supabase IDs to your user IDs
    // Or you might query your user table to find the matching user
    
    // For now, we'll just use a simple mapping approach for the mock user
    const user = await prisma.user.findFirst({
      where: {
        email: 'mock@example.com'
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.id;
  }

  async getOnboarding(): Promise<OnboardingModel | null> {
    try {
      const session = await this.getSession()
      const userId = await this.getUserIdFromSupabase(session.user.id)
      return await prisma.onboarding.findUnique({
        where: { userId }
      })
    } catch (error) {
      logger.error('Error fetching onboarding:', error)
      return null
    }
  }

  async createOnboarding(): Promise<OnboardingModel> {
    try {
      const session = await this.getSession()
      const userId = await this.getUserIdFromSupabase(session.user.id)
      return await prisma.onboarding.create({
        data: {
          userId,
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
      const userId = await this.getUserIdFromSupabase(session.user.id)
      return await prisma.onboarding.update({
        where: { userId },
        data: {
          steps: {
            [step]: true
          }
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
      const userId = await this.getUserIdFromSupabase(session.user.id)
      return await prisma.onboarding.update({
        where: { userId },
        data: { completed: true }
      })
    } catch (error) {
      logger.error('Error completing onboarding:', error)
      throw error
    }
  }

  async deleteOnboarding(): Promise<void> {
    try {
      const session = await this.getSession()
      const userId = await this.getUserIdFromSupabase(session.user.id)
      await prisma.onboarding.delete({
        where: { userId }
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

  async getAssessmentLessons(userId: string): Promise<AssessmentLesson[]> {
    try {
      return await prisma.assessmentLesson.findMany({
        where: { userId },
        orderBy: { step: 'asc' }
      })
    } catch (error) {
      logger.error('Error fetching assessment lessons:', error)
      throw error
    }
  }

  async completeAssessmentLesson(lessonId: string, userResponse: string): Promise<AssessmentLesson> {
    try {
      return await prisma.assessmentLesson.update({
        where: { id: lessonId },
        data: {
          userResponse,
          completed: true
        }
      })
    } catch (error) {
      logger.error('Error completing assessment lesson:', error)
      throw error
    }
  }
}
