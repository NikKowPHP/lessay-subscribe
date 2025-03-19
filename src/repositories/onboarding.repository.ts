import { PrismaClient } from '@prisma/client'
import { OnboardingModel } from '@/domain/models/models'
import { IOnboardingRepository } from '../services/onboarding.service'
import logger from '@/lib/logger'

const prisma = new PrismaClient()

export class OnboardingRepository implements IOnboardingRepository {
  async getOnboarding(): Promise<OnboardingModel | null> {
    try {
      const session = await auth()
      if (!session?.user?.id) {
        throw new Error('Unauthorized')
      }
      
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
      const session = await auth()
      if (!session?.user?.id) {
        throw new Error('Unauthorized')
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
      const session = await auth()
      if (!session?.user?.id) {
        throw new Error('Unauthorized')
      }
      
      return await prisma.onboarding.update({
        where: { userId: session.user.id },
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
      const session = await auth()
      if (!session?.user?.id) {
        throw new Error('Unauthorized')
      }
      
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
      const session = await auth()
      if (!session?.user?.id) {
        throw new Error('Unauthorized')
      }
      
      await prisma.onboarding.delete({
        where: { userId: session.user.id }
      })
    } catch (error) {
      logger.error('Error deleting onboarding:', error)
      throw error
    }
  }
}

// Export singleton
export const onboardingRepository = new OnboardingRepository()