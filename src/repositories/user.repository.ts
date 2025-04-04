import { IAuthService } from '@/services/auth.service'
import { ILessonRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { LessonModel, LessonStep, OnboardingModel, UserProfileModel } from '@/models/AppAllModels.model'
import prisma from '@/lib/prisma'

export interface IUserRepository {
  getUserProfile(userId: string): Promise<UserProfileModel | null>
  createUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel>
  updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel>
}

export class UserRepository implements IUserRepository {
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

  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    try {
      // First ensure the user is authorized to access this profile
      const session = await this.getSession()
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to access this profile')
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { onboarding: true }
      })

      if (!user) {
        return null
      }

      return {
        id: user.id,
        userId: user.id,
        email: user.email || '',
        name: user.name || undefined,
        nativeLanguage: user.onboarding?.nativeLanguage || undefined,
        targetLanguage: user.onboarding?.targetLanguage || undefined,
        proficiencyLevel: user.onboarding?.proficiencyLevel || undefined,
        learningPurpose: user.onboarding?.learningPurpose || undefined,
        onboardingCompleted: user.onboarding?.completed || false,
        createdAt: user.createdAt,
        initialAssessmentCompleted: user.onboarding?.initialAssessmentCompleted || false,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      logger.error('Error fetching user profile:', error)
      throw error
    }
  }

  async createUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      // Verify session first - optional since this might be called during registration
      // when session isn't fully established yet
      try {
        await this.getSession()
      } catch (error) {
        logger.warn('Creating user profile without active session')
      }
      
      const { userId, email } = profile
      
      if (!userId || !email) {
        throw new Error('Missing required fields: userId and email are required')
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (existingUser) {
        // If user exists but we're trying to create a profile, return the existing user profile
        const existingProfile = await this.getUserProfile(userId)
        if (existingProfile) {
          return existingProfile
        }
        throw new Error('User already exists but profile could not be retrieved')
      }

      // Create the user with minimal information
      const user = await prisma.user.create({
        data: {
          id: userId,
          email,
          // Create an empty onboarding record
          onboarding: {
            create: {
              steps: {},
              completed: false,
              // All other fields will be null/undefined until onboarding
            }
          }
        },
        include: {
          onboarding: true
        }
      })

      // Return a valid UserProfileModel with defaults for missing fields
      return {
        id: user.id,
        userId: user.id,
        email: user.email || '',
        name: user.name || null,
        nativeLanguage: null,
        targetLanguage: null,
        proficiencyLevel: null,
        learningPurpose: null,
        onboardingCompleted: false,
        initialAssessmentCompleted: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      logger.error('Error creating user profile:', error)
      throw error
    }
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      // First ensure the user is authorized to update this profile
      const session = await this.getSession()
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to update this profile')
      }

      // Extract onboarding specific fields
      const onboardingData: any = {}
      
      if ('nativeLanguage' in profile) onboardingData.nativeLanguage = profile.nativeLanguage
      if ('targetLanguage' in profile) onboardingData.targetLanguage = profile.targetLanguage
      if ('proficiencyLevel' in profile) onboardingData.proficiencyLevel = profile.proficiencyLevel
      if ('learningPurpose' in profile) onboardingData.learningPurpose = profile.learningPurpose
      if ('onboardingCompleted' in profile) onboardingData.completed = profile.onboardingCompleted
      if ('initialAssessmentCompleted' in profile) 
        onboardingData.initialAssessmentCompleted = profile.initialAssessmentCompleted

      // Update the user and their onboarding data
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: profile.name,
          onboarding: {
            upsert: {
              create: {
                ...onboardingData,
                steps: {}
              },
              update: onboardingData
            }
          }
        },
        include: {
          onboarding: true
        }
      })

      return {
        id: user.id,
        userId: user.id,
        email: user.email || '',
        name: user.name || null,
        nativeLanguage: user.onboarding?.nativeLanguage || null,
        targetLanguage: user.onboarding?.targetLanguage || null,
        proficiencyLevel: user.onboarding?.proficiencyLevel || null,
        learningPurpose: user.onboarding?.learningPurpose || null,
        onboardingCompleted: user.onboarding?.completed || false,
        initialAssessmentCompleted: user.onboarding?.initialAssessmentCompleted || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      logger.error('Error updating user profile:', error)
      throw error
    }
  }
}