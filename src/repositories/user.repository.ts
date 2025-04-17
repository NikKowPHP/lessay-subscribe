import { ILessonRepository } from '@/lib/interfaces/all-interfaces';
import logger from '@/utils/logger';
import {
  LessonModel,
  LessonStep,
  UserProfileModel,
} from '@/models/AppAllModels.model';
import prisma from '@/lib/prisma';
import { Prisma, SubscriptionStatus } from '@prisma/client';
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
          this.supabase =
            (await createSupabaseServerClient()) as SupabaseClient | null;
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
        throw new Error('No auth service available');
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

      const userProfile: UserProfileModel = {
        id: user.id,
        userId: user.id, // Assuming userId in model is same as id
        email: user.email, // Assuming email is always present
        name: user.name ?? undefined, // Use nullish coalescing for optional fields

        // Onboarding related fields (from included relation)
        nativeLanguage: user.onboarding?.nativeLanguage ?? undefined,
        targetLanguage: user.onboarding?.targetLanguage ?? undefined,
        proficiencyLevel: user.onboarding?.proficiencyLevel ?? undefined, // Ensure enum matches
        learningPurpose: user.onboarding?.learningPurpose ?? undefined,
        onboardingCompleted: user.onboarding?.completed ?? false,
        initialAssessmentCompleted:
          user.onboarding?.initialAssessmentCompleted ?? false,

        // Subscription fields (directly from User model)
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId ?? null,
        subscriptionPlan: user.subscriptionPlan ?? null,
        trialStartDate: user.trialStartDate ?? null,
        trialEndDate: user.trialEndDate ?? null,
        subscriptionStartDate: user.subscriptionStartDate ?? null,
        subscriptionEndDate: user.subscriptionEndDate ?? null,
        billingCycle: user.billingCycle ?? null,
        paymentMethodId: user.paymentMethodId ?? null,
        stripeCustomerId: user.stripeCustomerId ?? null,
        cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? false,

        // Timestamps
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Placeholder for Learning Progress Summary (if needed later)
        // learningProgressSummary: undefined, // Or fetch if required by model
      };

      return userProfile;
    } catch (error) {
      logger.error(`Error fetching user profile for userId ${userId}:`, error);
      // Re-throw the error to be handled by the service/action layer
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

   // Create the user with default subscription values
   const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      name: profile.name ?? null, // Add name if provided
      // Default subscription fields
      subscriptionStatus: SubscriptionStatus.NONE,
      subscriptionId: null,
      subscriptionEndDate: null,
      subscriptionPlan: null,
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: null,
      billingCycle: null,
      paymentMethodId: null,
      stripeCustomerId: null,
      cancelAtPeriodEnd: false,
      // Create related onboarding record
      onboarding: {
        create: {
          steps: {},
          completed: false,
          nativeLanguage: profile.nativeLanguage ?? null,
          targetLanguage: profile.targetLanguage ?? null,
          proficiencyLevel: profile.proficiencyLevel ?? null,
          learningPurpose: profile.learningPurpose ?? null,
          initialAssessmentCompleted: false,
        },
      },
    },
    include: {
      onboarding: true,
    },
  });

  // Map the created user back to the UserProfileModel
  return await this.getUserProfile(user.id) as UserProfileModel; // Re-fetch to ensure consistency
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfileModel>
  ): Promise<UserProfileModel> {
    try {
      const session = await this.getSession();
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to update this profile');
      }

      const userData: Prisma.UserUpdateInput = {};
      const onboardingData: Prisma.OnboardingUpdateInput = {};

      // User fields
      if ('name' in profile && profile.name !== undefined) userData.name = profile.name;
      // IMPORTANT: Exclude direct updates to subscription fields managed by webhooks
      const {
          subscriptionStatus, subscriptionId, subscriptionEndDate, subscriptionPlan,
          trialStartDate, trialEndDate, subscriptionStartDate, billingCycle,
          paymentMethodId, stripeCustomerId, cancelAtPeriodEnd,
          // Onboarding fields handled below
          nativeLanguage, targetLanguage, proficiencyLevel, learningPurpose,
          onboardingCompleted, initialAssessmentCompleted,
          // Other fields
          id, userId: profileUserId, email, createdAt, updatedAt, learningProgressSummary,
          ...restOfUserData
      } = profile;

      // Onboarding fields
      if ('nativeLanguage' in profile && profile.nativeLanguage !== undefined) onboardingData.nativeLanguage = profile.nativeLanguage;
      if ('targetLanguage' in profile && profile.targetLanguage !== undefined) onboardingData.targetLanguage = profile.targetLanguage;
      if ('proficiencyLevel' in profile && profile.proficiencyLevel !== undefined) onboardingData.proficiencyLevel = profile.proficiencyLevel;
      if ('learningPurpose' in profile && profile.learningPurpose !== undefined) onboardingData.learningPurpose = profile.learningPurpose;
      if ('onboardingCompleted' in profile && profile.onboardingCompleted !== undefined) onboardingData.completed = profile.onboardingCompleted;
      if ('initialAssessmentCompleted' in profile && profile.initialAssessmentCompleted !== undefined) onboardingData.initialAssessmentCompleted = profile.initialAssessmentCompleted;

      const hasUserUpdates = Object.keys(userData).length > 0;
      const hasOnboardingUpdates = Object.keys(onboardingData).length > 0;

      if (!hasUserUpdates && !hasOnboardingUpdates) {
         logger.warn(`updateUserProfile called for user ${userId} with no fields to update.`);
         const currentProfile = await this.getUserProfile(userId);
         if (!currentProfile) throw new Error(`User profile ${userId} not found.`);
         return currentProfile;
      }

      // Perform the update
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...userData, // Update user fields
          // Upsert onboarding data only if there are onboarding updates
          ...(hasOnboardingUpdates && {
             onboarding: {
               upsert: {
                 where: { userId: userId }, // Condition for update
                 create: { // Data for creation if onboarding doesn't exist
                   // REMOVED userId: userId, // Prisma handles this link automatically
                   steps: {}, // Default empty steps
                   completed: profile.onboardingCompleted ?? false,
                   initialAssessmentCompleted: profile.initialAssessmentCompleted ?? false,
                   nativeLanguage: profile.nativeLanguage ?? null,
                   targetLanguage: profile.targetLanguage ?? null,
                   proficiencyLevel: profile.proficiencyLevel ?? null,
                   learningPurpose: profile.learningPurpose ?? null,
                 },
                 update: onboardingData, // Data for update if onboarding exists
               },
             },
          }),
        },
        include: {
          onboarding: true, // Include the updated/created onboarding data
        },
      });

      // Map the updated user back to the UserProfileModel
      const fetchedProfile = await this.getUserProfile(user.id);
       if (!fetchedProfile) {
         // This should not happen if update was successful
         throw new Error("Failed to retrieve updated user profile.");
      }
      return fetchedProfile;

    } catch (error) {
      logger.error(`Error updating user profile for userId ${userId}:`, error);
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

      logger.warn(`Starting DB deletion for user: ${userId}`);

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
         // Delete dependent records first in the correct order
         await tx.payment.deleteMany({ where: { userId: userId } });
         await tx.audioMetrics.deleteMany({ where: { OR: [{ lesson: { userId: userId } }, { assessmentLesson: { userId: userId } }] } });
         await tx.lessonStep.deleteMany({ where: { lesson: { userId: userId } } });
         await tx.lesson.deleteMany({ where: { userId: userId } });
         await tx.assessmentStep.deleteMany({ where: { assessment: { userId: userId } } });
         await tx.assessmentLesson.deleteMany({ where: { userId: userId } });
         await tx.wordProgress.deleteMany({ where: { learningProgress: { userId: userId } } });
         await tx.topicProgress.deleteMany({ where: { learningProgress: { userId: userId } } });
         await tx.learningProgress.deleteMany({ where: { userId: userId } });
         await tx.onboarding.deleteMany({ where: { userId: userId } });
         // Finally, delete the user
         await tx.user.delete({ where: { id: userId } });
      });

      logger.info(`DB deletion complete for user: ${userId}`);

      // Step 2: Delete auth user (server-side only)
      if (typeof window === 'undefined' && this.getSupabaseClient) {
        const supabase = await this.getSupabaseClient();
        if (!supabase) {
          throw new Error('No auth service available');
        }

        logger.warn(`Starting Auth Provider deletion for user: ${userId}`);
        // Use admin API for user deletion
        const { error: authError } = await supabase.auth.admin.deleteUser(
          userId
        );

        if (authError) {
          // Log the error but don't necessarily throw if DB deletion succeeded
          // It might be an orphaned auth user or other issue.
          logger.error(`Auth Provider deletion failed for user ${userId}: ${authError.message}`, {
             userId, code: (authError as any).code, status: (authError as any).status
          });
           // Optionally re-throw if auth deletion failure is critical
           // throw new Error(`Failed to delete auth user: ${authError.message}`);
        } else {
           logger.info(`Auth Provider user deleted successfully: ${userId}`);
        }
      }

      logger.warn(`Full deletion process completed for user: ${userId}`);
    } catch (error: any) {
      logger.error(`Error during user profile deletion transaction for userId: ${userId}`, {
        message: error.message,
        stack: error.stack,
        code: error.code, // Include Prisma error code if available
      });

      // Handle specific Prisma errors like P2025 (Record to delete not found)
      if (error.code === 'P2025') {
        logger.warn(
          `User profile or related record not found in DB during deletion (userId: ${userId}). Might have been already deleted.`
        );
        // Consider this potentially successful if the goal is user removal.
        // Optionally, still attempt Auth deletion.
        return;
      }

      // Re-throw other database or unexpected errors
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }

}
