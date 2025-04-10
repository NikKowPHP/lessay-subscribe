'use server';

import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';

function createUserService() {
  const authService = getAuthServiceBasedOnEnvironment();
  const repository = new UserRepository(authService);
  return new UserService(repository);
}

export async function getUserProfileAction(userId: string): Promise<UserProfileModel | null> {
  try {
    // Security check: Ensure the requested profile belongs to the logged-in user
    const currentUserId = await getCurrentUserId();
    if (userId !== currentUserId) {
      logger.warn(`Unauthorized attempt to get profile. Logged in user: ${currentUserId}, Requested user: ${userId}`);
      throw new Error('Unauthorized');
    }
    const userService = createUserService();
    return await userService.getUserProfile(userId);
  } catch (error) {
    logger.error('Error in getUserProfileAction:', { error: (error as Error).message });
    // Don't return null for auth errors, let the error propagate
    if ((error as Error).message.includes('Unauthorized') || (error as Error).message.includes('Authentication required')) {
      throw error;
    }
    return null; // Return null for other fetch errors (e.g., user not found in DB)
  }
}

export async function createUserProfileAction(profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService();
    return await userService.createUserProfile(profile);
  } catch (error) {
    logger.error('Error in createUserProfileAction:', error);
    throw error;
  }
}

export async function updateUserProfileAction(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    // Security check: Ensure the user is updating their own profile
    const currentUserId = await getCurrentUserId();
    if (userId !== currentUserId) {
      logger.warn(`Unauthorized attempt to update profile. Logged in user: ${currentUserId}, Target user: ${userId}`);
      throw new Error('Unauthorized');
    }
    const userService = createUserService();
    return await userService.updateUserProfile(userId, profile);
  } catch (error) {
    logger.error('Error in updateUserProfileAction:', { error: (error as Error).message });
    // Re-throw to indicate failure
    throw error;
  }
}
export async function deleteUserProfileAction(): Promise<{ success: boolean; error?: string }> {
  let userId: string | null = null;
  try {
    userId = await getCurrentUserId(); // Get the ID of the logged-in user making the request
    logger.warn(`deleteUserProfileAction: Initiating profile deletion for user: ${userId}`);

    const userService = createUserService();
    // Call the service layer method to delete the user (handles DB + Auth)
    await userService.deleteUserProfile(userId);

    logger.warn(`deleteUserProfileAction: Successfully completed profile deletion for user: ${userId}`);

    // Optional: Revalidate relevant paths or trigger client-side logout/redirect
    revalidatePath('/'); // Revalidate home or relevant pages
    revalidatePath('/app'); // Revalidate app root

    return { success: true };

  } catch (error: any) {
    logger.error(`Error in deleteUserProfileAction for user ${userId || 'UNKNOWN'}:`, { message: error.message, stack: error.stack });

    // Provide a user-friendly error message
    let errorMessage = 'Failed to delete profile due to an unexpected error.';
    if (error.message.includes('Unauthorized')) {
      errorMessage = 'Unauthorized to perform this action.';
    } else if (error.message.includes('Authentication required')) {
      errorMessage = 'Authentication required. Please log in again.';
    }
    // Add more specific error handling if needed

    return { success: false, error: errorMessage };
  }
}

async function getCurrentUserId(): Promise<string> {
  const authService = getAuthServiceBasedOnEnvironment();
  const session = await authService.getSession();
  if (!session?.user?.id) {
    throw new Error('Authentication required.');
  }
  return session.user.id;
}
