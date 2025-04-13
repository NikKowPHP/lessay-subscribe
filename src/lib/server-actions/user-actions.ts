'use server';

import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { getAuthServiceBasedOnEnvironment, IAuthService } from '@/services/supabase-auth.service';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

async function getAccessTokenFromRequest() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (!accessToken) {
    logger.error('No access token found in cookies');
    throw new Error('Authentication required');
  }
  return accessToken;
}

async function createUserService(): Promise<UserService> {
  try {
    const accessToken = await getAccessTokenFromRequest();
    const authService = getAuthServiceBasedOnEnvironment(accessToken);
    return new UserService(new UserRepository(authService));
  } catch (error) {
    logger.error('Error in createUserService:', error);
    throw error;
  }
}

export async function getUserProfileAction(userId: string): Promise<UserProfileModel | null> {

  try {
    const userService = await createUserService();
    return await userService.getUserProfile(userId);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    throw error;
  }
}



export async function createUserProfileAction(profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    const userService = await createUserService();
    return await userService.createUserProfile(profile);
  } catch (error) {
    logger.error('Error in createUserProfileAction:', error);
    throw error;
  }
}

export async function updateUserProfileAction(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    const userService = await createUserService();
    return await userService.updateUserProfile(userId, profile);

  } catch (error) {
    logger.error('Error in updateUserProfileAction:', { error: (error as Error).message });
    // Re-throw to indicate failure
    throw error;
  }
}
export async function deleteUserProfileAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userService = await createUserService();
    
    
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

