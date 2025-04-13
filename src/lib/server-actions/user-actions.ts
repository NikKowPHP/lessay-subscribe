'use server';

import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';

function createUserService(accessToken?: string) {
  const repository = new UserRepository(accessToken);
  return new UserService(repository);
}

export async function getUserProfileAction(userId: string, accessToken?: string): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService(accessToken);
    logger.log('userService in getUserProfileAction', userService)
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

export async function createUserProfileAction(profile: Partial<UserProfileModel>, accessToken?: string): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService(accessToken);
    return await userService.createUserProfile(profile);
  } catch (error) {
    logger.error('Error in createUserProfileAction:', error);
    throw error;
  }
}

export async function updateUserProfileAction(userId: string, profile: Partial<UserProfileModel>, accessToken?: string): Promise<UserProfileModel | null> {
  try {
    // Security check: Ensure the user is updating their own profile
  
    const userService = createUserService(accessToken);
    return await userService.updateUserProfile(userId, profile);
  } catch (error) {
    logger.error('Error in updateUserProfileAction:', { error: (error as Error).message });
    // Re-throw to indicate failure
    throw error;
  }
}
export async function deleteUserProfileAction(userId: string, accessToken?: string): Promise<{ success: boolean; error?: string }> {
  try {

    const userService = createUserService(accessToken);
    const authService = getAuthServiceBasedOnEnvironment(accessToken);
    const session = await authService.getSession();
    logger.log('session in deleteUserProfileAction', session)
    if (!session?.user?.id) {
      throw new Error('Authentication required.');
    }
    userId = session.user.id;
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

