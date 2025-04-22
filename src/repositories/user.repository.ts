import logger from '@/utils/logger';
import { UserProfileModel } from '@/models/AppAllModels.model';
import prisma from '@/lib/prisma';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import supabaseAdmin from '@/utils/supabase/admin';

export interface IUserRepository {
  getUserProfile(userId: string): Promise<UserProfileModel | null>;
  createUserProfile(profileData: { userId: string; email: string }): Promise<UserProfileModel>; // Simplified input
  updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel>;
  deleteUserProfile(userId: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      this.supabase = null;
      this.getSupabaseClient = async () => {
        if (!this.supabase) {
          this.supabase = await createSupabaseServerClient() as SupabaseClient | null;
        }
        return this.supabase;
      };
    }
  }

  private getSupabaseClient?: () => Promise<SupabaseClient | null>;

  // Helper to get authenticated session (server-side)
  private async getSession() {
    if (typeof window === 'undefined' && this.getSupabaseClient) {
      const supabase = await this.getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw new Error(`Supabase getSession error: ${error.message}`);
      if (!session?.user?.id) throw new Error('Unauthorized: No active session');
      return session;
    }
    throw new Error('getSession can only be called server-side in this repository');
  }

  // Maps Prisma User (with onboarding) to UserProfileModel
  private mapToUserProfile(user: Prisma.UserGetPayload<{ include: { onboarding: true } }>): UserProfileModel {
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
      initialAssessmentCompleted: user.onboarding?.initialAssessmentCompleted || false,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionId: user.subscriptionId,
      subscriptionPlan: user.subscriptionPlan,
      trialStartDate: user.trialStartDate,
      trialEndDate: user.trialEndDate,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
      billingCycle: user.billingCycle,
      paymentMethodId: user.paymentMethodId,
      stripeCustomerId: user.stripeCustomerId,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Fetches the user profile, returns null if not found. Does NOT create.
  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    try {
      const session = await this.getSession();
      if (session.user.id !== userId) {
        logger.error(`Unauthorized attempt to get profile. Logged in user: ${session.user.id}, Requested user: ${userId}`);
        throw new Error('Unauthorized to access this profile');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { onboarding: true },
      });

      if (!user) {
        logger.info(`User profile not found in DB for user ${userId}.`);
        return null; // Explicitly return null if not found
      }

      return this.mapToUserProfile(user);
    } catch (error) {
      // Don't log expected "Unauthorized" as error here, let caller handle
      if (!(error instanceof Error && error.message.startsWith('Unauthorized'))) {
        logger.error(`Error fetching user profile for ${userId}:`, error);
      }
      throw error; // Re-throw other errors
    }
  }

  // Creates the user profile. Assumes it doesn't exist. Handles email conflict.
  async createUserProfile(profileData: { userId: string; email: string }): Promise<UserProfileModel> {
    const { userId, email } = profileData;
    logger.info(`Attempting to create profile for user ${userId} with email ${email}`);
    try {
      // No need to re-verify session here if called from an authenticated context like UserProfileProvider

      // Create the user with minimal information and default onboarding
      const user = await prisma.user.create({
        data: {
          id: userId,
          email: email,
          subscriptionStatus: SubscriptionStatus.NONE, // Default status
          onboarding: {
            create: { steps: {}, completed: false }, // Default onboarding state
          },
        },
        include: { onboarding: true },
      });

      logger.info(`Successfully created profile for user ${userId}`);
      return this.mapToUserProfile(user);

    } catch (error: any) {
      // Handle unique constraint violation (likely email)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        logger.warn(`UserRepository.createUserProfile: Unique constraint violation (likely email: ${email}). Attempting to fetch existing profile for user ${userId}.`);
        // Attempt to fetch the existing profile by userId, as the email conflict implies the user might exist under that ID
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { onboarding: true },
        });
        if (existingUser) {
          logger.info(`Found existing profile for user ${userId} after email conflict.`);
          return this.mapToUserProfile(existingUser);
        } else {
          // This is an unusual state: email exists, but user ID doesn't match? Log and throw.
          logger.error(`Critical error: Email ${email} exists, but user ${userId} not found after P2002 error.`);
          throw new Error(`Failed to resolve profile conflict for email ${email}.`);
        }
      }
      // Log and re-throw other errors
      logger.error(`Error creating user profile for ${userId}:`, error);
      throw error;
    }
  }

  // Updates the user profile.
  async updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      const session = await this.getSession();
      if (session.user.id !== userId) {
        throw new Error('Unauthorized to update this profile');
      }

      const onboardingData: any = {};
      if ('nativeLanguage' in profile) onboardingData.nativeLanguage = profile.nativeLanguage;
      if ('targetLanguage' in profile) onboardingData.targetLanguage = profile.targetLanguage;
      if ('proficiencyLevel' in profile) onboardingData.proficiencyLevel = profile.proficiencyLevel;
      if ('learningPurpose' in profile) onboardingData.learningPurpose = profile.learningPurpose;
      if ('onboardingCompleted' in profile) onboardingData.completed = profile.onboardingCompleted;
      if ('initialAssessmentCompleted' in profile) onboardingData.initialAssessmentCompleted = profile.initialAssessmentCompleted;

      const userUpdateData: Prisma.UserUpdateInput = {
        name: profile.name,
        // Add other direct User fields if needed (e.g., subscription fields handled by webhooks)
      };

      // Only include onboarding update if there's data for it
      if (Object.keys(onboardingData).length > 0) {
        userUpdateData.onboarding = {
          upsert: {
            // Provide minimal create data, Prisma requires it even if we expect update
            create: { steps: {}, completed: false, ...onboardingData },
            update: onboardingData,
          },
        };
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
        include: { onboarding: true },
      });

      return this.mapToUserProfile(user);
    } catch (error) {
      logger.error(`Error updating user profile for ${userId}:`, error);
      throw error;
    }
  }

  // Deletes the user profile and associated data.
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      const session = await this.getSession();
      if (session.user.id !== userId) {
        logger.error(`Unauthorized delete attempt. Session user: ${session.user.id}, Target: ${userId}`);
        throw new Error('Unauthorized: You can only delete your own profile.');
      }

      logger.warn(`Starting deletion process for user: ${userId}`);

      // Use Prisma transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Delete related data first (adjust based on your schema relations and cascade settings)
        // Example: Delete LessonSteps, Lessons, Onboarding, AudioMetrics, Progress etc.
        // If cascade deletes are set up in Prisma schema, some of these might be automatic.
        await tx.lessonStep.deleteMany({ where: { lesson: { userId: userId } } });
        await tx.audioMetrics.deleteMany({ where: { OR: [{ lesson: { userId: userId } }, { assessmentLesson: { userId: userId } }] } });
        await tx.lesson.deleteMany({ where: { userId: userId } });
        await tx.assessmentStep.deleteMany({ where: { assessment: { userId: userId } } });
        await tx.assessmentLesson.deleteMany({ where: { userId: userId } });
        await tx.onboarding.deleteMany({ where: { userId: userId } });
        await tx.payment.deleteMany({ where: { userId: userId } }); // Assuming Payment model exists
        await tx.topicProgress.deleteMany({ where: { learningProgress: { userId: userId } } });
        await tx.wordProgress.deleteMany({ where: { learningProgress: { userId: userId } } });
        await tx.learningProgress.deleteMany({ where: { userId: userId } });

        // Finally, delete the user record itself
        await tx.user.delete({ where: { id: userId } });
        logger.info(`DB deletion transaction complete for user: ${userId}`);
      });

      // Delete the user from the Auth provider (Supabase Auth)
      if (typeof window === 'undefined') { // Ensure server-side context
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          // Log error but don't necessarily throw if DB deletion succeeded,
          // as the user might be partially deleted. Depends on desired behavior.
          logger.error(`Auth Provider user deletion failed for ${userId}: ${authError.message}`);
          // Consider throwing a specific error if auth deletion failure is critical
          // throw new Error(`Failed to delete user from Auth Provider: ${authError.message}`);
        } else {
          logger.info(`Auth Provider user deleted successfully: ${userId}`);
        }
      }

      logger.warn(`Deletion process fully completed for user: ${userId}`);

    } catch (error: any) {
      // Handle specific Prisma "Record not found" error during deletion gracefully
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        logger.warn(`User profile or related data not found during deletion for userId: ${userId}. Assuming already deleted.`);
        // Attempt Auth deletion just in case it's an orphaned auth user
        if (typeof window === 'undefined') {
          try {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError && authError.message !== 'User not found') { // Ignore "User not found" error here
              logger.error(`Auth Provider deletion failed for potentially orphaned user ${userId}: ${authError.message}`);
            } else if (!authError) {
              logger.info(`Auth Provider user deleted successfully for potentially orphaned user ${userId}.`);
            }
          } catch (authCatchError) {
            logger.error(`Exception during Auth Provider deletion for potentially orphaned user ${userId}:`, authCatchError);
          }
        }
        return; // Consider deletion successful if record wasn't found
      }
      // Log and re-throw other errors
      logger.error(`Error during user profile deletion for userId: ${userId}:`, error);
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }
}
// --- NEW CODE END ---
