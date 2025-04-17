import { ILessonRepository } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import {
  LessonModel,
  LessonStep,
  UserProfileModel,
} from '@/models/AppAllModels.model';
import prisma from '@/lib/prisma';
import { SubscriptionStatus } from '@prisma/client';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { SupabaseClient } from '@supabase/supabase-js';

export interface IUserRepository {
  getUserProfile(userId: string): Promise<UserProfileModel | null>;
  createUserProfile(
    profile: Partial<UserProfileModel>
  ): Promise<UserProfileModel>;
  updateUserProfile(
    userId: string,
    profile: Partial<UserProfileModel>
  ): Promise<UserProfileModel>;
  deleteUserProfile(userId: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  private supabase: SupabaseClient | null = null;

  constructor() {
    // For server-side usage, create Supabase client
    if (typeof window === 'undefined') {
      // Initialize supabase synchronously but mark it as potentially null
      this.supabase = null;
      // Create a helper method to get the client when needed
      this.getSupabaseClient = async () => {
        if (!this.supabase) {
          this.supabase = await createSupabaseServerClient() as SupabaseClient | null;
        }
        return this.supabase;
      };
    }
    // For client-side usage, use the passed authService
  
  }

  private getSupabaseClient?: () => Promise<SupabaseClient | null>;

  async getSession() {
    // Server-side session handling
    if (typeof window === 'undefined' && this.getSupabaseClient) {
      const supabase = await this.getSupabaseClient();
      if (!supabase) {
        throw new Error('No auth service available')
      }
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session?.user?.id) {
        throw new Error('Unauthorized');
      }
      return session;
    }
   
    throw new Error('No auth service available');
  }

  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    try {
      // First ensure the user is authorized to access this profile
      const session = await this.getSession();
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to access this profile');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { onboarding: true },
      });

      if (!user) {
        return null;
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
        initialAssessmentCompleted:
          user.onboarding?.initialAssessmentCompleted || false,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate || null,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async createUserProfile(
    profile: Partial<UserProfileModel>
  ): Promise<UserProfileModel> {
    try {
      // Verify session first - optional since this might be called during registration
      // when session isn't fully established yet
      const session = await this.getSession();
      logger.info('session', session);
      if (session.user.id !== profile.userId) {
        throw new Error('Unauthorized to create this profile');
      }

      const { userId, email } = profile;

      logger.info('creating user in repo', profile);

      if (!userId || !email) {
        throw new Error(
          'Missing required fields: userId and email are required'
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (existingUser) {
        // If user exists but we're trying to create a profile, return the existing user profile
        const existingProfile = await this.getUserProfile(userId);
        if (existingProfile) {
          return existingProfile;
        }
        throw new Error(
          'User already exists but profile could not be retrieved'
        );
      }

      // Create the user with minimal information
      const user = await prisma.user.create({
        data: {
          id: profile.userId!,
          email: profile.email!,
          subscriptionStatus: SubscriptionStatus.NONE,
          subscriptionEndDate: null,
          onboarding: {
            create: { steps: {}, completed: false },
          },
        },
        include: { onboarding: true },
      });

      // Return a valid UserProfileModel with defaults for missing fields
      return {
        id: user.id,
        userId: user.id,
        email: user.email!,
        onboardingCompleted: false,
        initialAssessmentCompleted: false,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error: any) {
      logger.error('Error creating user profile:', error);

      // If Prisma says “P2002 unique constraint on email” → fetch the existing record
      if (
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        (error.meta.target as string[]).includes('email')
      ) {
        logger.warn(
          'UserRepository.createUserProfile: email already exists—fetching existing profile'
        );
        // fetch by userId (or by email)
        return (await this.getUserProfile(profile.userId!))!;
      }

      throw error;
    }
  }

  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfileModel>
  ): Promise<UserProfileModel> {
    try {
      // First ensure the user is authorized to update this profile
      const session = await this.getSession();
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to update this profile');
      }

      // Extract onboarding specific fields
      const onboardingData: any = {};

      if ('nativeLanguage' in profile)
        onboardingData.nativeLanguage = profile.nativeLanguage;
      if ('targetLanguage' in profile)
        onboardingData.targetLanguage = profile.targetLanguage;
      if ('proficiencyLevel' in profile)
        onboardingData.proficiencyLevel = profile.proficiencyLevel;
      if ('learningPurpose' in profile)
        onboardingData.learningPurpose = profile.learningPurpose;
      if ('onboardingCompleted' in profile)
        onboardingData.completed = profile.onboardingCompleted;
      if ('initialAssessmentCompleted' in profile)
        onboardingData.initialAssessmentCompleted =
          profile.initialAssessmentCompleted;

      // Update the user and their onboarding data
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: profile.name,
          onboarding: {
            upsert: {
              create: {
                ...onboardingData,
                steps: {},
              },
              update: onboardingData,
            },
          },
        },
        include: {
          onboarding: true,
        },
      });

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
        initialAssessmentCompleted:
          user.onboarding?.initialAssessmentCompleted || false,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async deleteUserProfile(userId: string): Promise<void> {
    try {
      // Verify authorization
      const session = await this.getSession();
      if (session.user.id !== userId) {
        logger.error(
          `Unauthorized delete attempt. Session user: ${session.user.id}, Target: ${userId}`
        );
        throw new Error('Unauthorized: You can only delete your own profile.');
      }

      logger.warn(`Starting deletion for user: ${userId}`);

      // Step 1: Delete all user-related data first
      await prisma.$transaction([
        // Delete lesson steps first
        prisma.lessonStep.deleteMany({
          where: {
            lesson: {
              userId: userId
            }
          }
        }),
        // Then delete lessons
        prisma.lesson.deleteMany({
          where: {
            userId: userId
          }
        }),
        // Delete onboarding data
        prisma.onboarding.deleteMany({
          where: {
            userId: userId
          }
        }),
        // Finally delete the user
        prisma.user.delete({
          where: { id: userId }
        })
      ]);

      logger.info(`DB deletion complete: ${userId}`);

      // Step 2: Delete auth user (server-side only)
      if (typeof window === 'undefined' && this.getSupabaseClient) {
        const supabase = await this.getSupabaseClient();
        if (!supabase) {
          throw new Error('No auth service available');
        }
        
        // Handle mock user deletion differently
        // if (userId === 'mock-user-id') {
        //   logger.warn('Bypassing auth deletion for mock user');
        //   return;
        // }

        // Use admin API for user deletion
        const { error: authError } = await supabase.auth.admin.deleteUser(
          userId
        );

        if (authError) {
          logger.error(`Auth deletion failed: ${authError.message}`, {
            userId,
          });
          throw new Error('Failed to delete auth user');
        }
        logger.info(`Auth user deleted: ${userId}`);
      }

      logger.warn(`Deletion completed for: ${userId}`);
    } catch (error: any) {
      logger.error(`Error during user profile deletion for userId: ${userId}`, {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });

      // Handle specific Prisma errors
      if (error.code === 'P2025') {
        // Record to delete not found
        logger.warn(
          `User profile not found in DB for deletion (userId: ${userId}). Might have been already deleted.`
        );
        // Consider this a success case as the user is gone from DB.
        // Still attempt Auth deletion just in case.
        try {
          logger.info(
            `Attempting Auth Provider deletion for potentially orphaned user: ${userId}`
          );
          if (typeof window === 'undefined' && this.getSupabaseClient) {
            const supabase = await this.getSupabaseClient();
            if (!supabase) {
              throw new Error('No auth service available')
            }
            const { error: authError } = await supabase.auth.admin.deleteUser(
              userId
            );

            if (authError) {
              logger.error(
                `Failed to delete potentially orphaned user ${userId} from Auth Provider: ${
                  authError.message || authError
                }`
              );
            } else {
              logger.info(
                `Successfully deleted potentially orphaned user ${userId} from Auth Provider.`
              );
            }
          }
        } catch (authCatchError: any) {
          logger.error(
            `Exception during Auth Provider deletion for potentially orphaned user ${userId}:`,
            authCatchError
          );
        }
        return; // Exit successfully
      }

      // Re-throw other database or unexpected errors
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }
}
