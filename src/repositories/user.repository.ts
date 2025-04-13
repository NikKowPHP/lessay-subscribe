import { IAuthService } from '@/services/supabase-auth.service'
import { ILessonRepository } from '@/lib/interfaces/all-interfaces'
import logger from '@/utils/logger'
import { LessonModel, LessonStep, UserProfileModel } from '@/models/AppAllModels.model'
import prisma from '@/lib/prisma'
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service'
import { SubscriptionStatus } from '@prisma/client'

export interface IUserRepository {
  getUserProfile(userId: string): Promise<UserProfileModel | null>
  createUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel>
  updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel>
  deleteUserProfile(userId: string): Promise<void>
}

export class UserRepository implements IUserRepository {
  private authService: IAuthService
  private adminAuthService: IAuthService | null = null;

  constructor(authService?: IAuthService) {
    this.authService = authService || getAuthServiceBasedOnEnvironment();
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.adminAuthService = getAuthServiceBasedOnEnvironment(); // Pass flag for admin
    }
  }

  async getSession() {
    try {
      const session = await this.authService.getSession();
      logger.info('Session in repository:', session);
      
      if (!session?.user?.id) {
        logger.error('Session validation failed - no user ID');
        return null;
      }
      return session;
    } catch (error) {
      logger.error('Session retrieval failed:', error);
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    try {
      const session = await this.getSession()
      if (!session || session.user.id !== userId) {
        return null
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
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate || null,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      logger.error('Error fetching user profile:', error)
      return null
    }
  }

  async createUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      // Verify session first - optional since this might be called during registration
      // when session isn't fully established yet
      const session = await this.getSession()
      logger.info('session', session)
      if (session && session.user.id !== profile.userId) {
        throw new Error('Unauthorized to create this profile')
      }

      const { userId, email } = profile

      logger.info('creating user in repo', profile);

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
          subscriptionStatus: SubscriptionStatus.NONE, // Default status
          subscriptionEndDate: null,

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
        // name: user.name || null,
        // nativeLanguage: null,
        // targetLanguage: null,
        // proficiencyLevel: null,
        // learningPurpose: null,

        onboardingCompleted: false,
        initialAssessmentCompleted: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt || new Date(),
        subscriptionStatus: user.subscriptionStatus, // Include default status
        subscriptionEndDate: user.subscriptionEndDate, // Include default end date

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
      if (session && session.user.id !== userId) {
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
        // name: user.name || null,
        // nativeLanguage: user.onboarding?.nativeLanguage || null,
        // targetLanguage: user.onboarding?.targetLanguage || null,
        // proficiencyLevel: user.onboarding?.proficiencyLevel || null,
        // learningPurpose: user.onboarding?.learningPurpose || null,
        onboardingCompleted: user.onboarding?.completed || false,
        initialAssessmentCompleted: user.onboarding?.initialAssessmentCompleted || false,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    } catch (error) {
      logger.error('Error updating user profile:', error)
      throw error
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    // Get an instance of the Auth service (potentially configured with admin rights)
    // This ensures we use the same logic (mock or real) as the rest of the app
    // and allows the factory function to provide an admin client if needed server-side.
    const adminAuthService = getAuthServiceBasedOnEnvironment();

    try {
      // CRITICAL: Verify authorization again within the repository method
      const session = await this.getSession();
      if (session && session.user.id !== userId) {
        logger.error(`Unauthorized attempt to delete user profile in repository. Session user: ${session.user.id}, Target user: ${userId}`);
        throw new Error('Unauthorized: You can only delete your own profile.');
      }

      logger.warn(`Initiating deletion process for user profile and associated data for userId: ${userId}`);

      // Step 1: Delete the user record from the database.
      logger.info(`Attempting to delete user data from DB for userId: ${userId}`);
      await prisma.user.delete({
        where: { id: userId },
      });
      logger.info(`Successfully deleted user data from DB for userId: ${userId}`);

      // Step 2: Delete the user from the authentication provider (Supabase Auth)
      logger.info(`Attempting to delete user from Auth Provider for userId: ${userId}`);
      if (!this.adminAuthService) {
        logger.error('Admin Auth Service is not initialized');
        throw new Error('Admin Auth Service is not initialized');
      }
      const { error: authError } = await this.adminAuthService.deleteUserById(userId);

      if (authError) {
        logger.error(`Failed to delete user from Auth Provider (Supabase Auth): ${authError.message || authError}`, { userId });
      } else {
        logger.info(`Successfully deleted user from Auth Provider for userId: ${userId}`);
      }

      logger.warn(`Completed deletion process for userId: ${userId}`);

    } catch (error: any) {
      logger.error(`Error during user profile deletion for userId: ${userId}`, { code: error.code, message: error.message, stack: error.stack });

      // Handle specific Prisma errors
      if (error.code === 'P2025') { // Record to delete not found
        logger.warn(`User profile not found in DB for deletion (userId: ${userId}). Might have been already deleted.`);
        // Consider this a success case as the user is gone from DB.
        // Still attempt Auth deletion just in case.
        try {
          logger.info(`Attempting Auth Provider deletion for potentially orphaned user: ${userId}`);
          if (!this.adminAuthService) {
            logger.error('Admin Auth Service is not initialized');
            throw new Error('Admin Auth Service is not initialized');
          }
          const { error: authError } = await this.adminAuthService.deleteUserById(userId);
          if (authError) {
            logger.error(`Failed to delete potentially orphaned user ${userId} from Auth Provider: ${authError.message || authError}`);
          } else {
            logger.info(`Successfully deleted potentially orphaned user ${userId} from Auth Provider.`);
          }
        } catch (authCatchError: any) {
          logger.error(`Exception during Auth Provider deletion for potentially orphaned user ${userId}:`, authCatchError);
        }
        return; // Exit successfully
      }

      // Re-throw other database or unexpected errors
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }
}
