import { OnboardingModel, AssessmentLesson } from '@/models/AppAllModels.model'
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

  async getAssessmentLessons(): Promise<AssessmentLesson[]> {
    try {
      const session = await this.getSession()
      return await prisma.assessmentLesson.findMany({
        where: { userId: session.user.id },
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
