'use server';

import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase, SupabaseAuthService } from '@/services/supabase-auth.service';
import { AuthError } from '@supabase/supabase-js';

function createUserService() {
  const authService = getAuthServiceBasedOnEnvironment();
  const repository = new UserRepository(authService);
  return new UserService(repository);
}

// New Server Actions based on SupabaseAuthService methods
export async function loginAction(email: string, password: string): Promise<{ data: { user: User | null; session: Session | null }, error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    logger.error('Login error:', error);
    return { data: { user: null, session: null }, error };
  }
  return { data, error: null };
}

export async function registerAction(email: string, password: string): Promise<{ data: { user: User | null; session: Session | null }, error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    logger.error('Registration error:', error);
    return { data: { user: null, session: null }, error };
  }
  return { data, error: null };
}

export async function loginWithGoogleAction(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/app/lessons` // Ensure this is set in your env vars
    }
  });
  if (error) {
    logger.error('Google login error:', error);
    return { error };
  }
  return { error: null };
}


export async function logoutAction(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('Logout error:', error);
    return { error };
  }
  return { error: null };
}

export async function getSessionAction(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    logger.error('Get session error:', error);
    return null;
  }
  return session;
}

// Note:  onAuthStateChange cannot be directly moved to a server action
// because it relies on a client-side subscription.  This will remain in the
// AuthProvider component.

export async function deleteUserByIdAction(userId: string): Promise<{ error: any | null }> {
  // This method MUST run on the server and use the admin client
  if (typeof window !== 'undefined') {
    logger.error('Attempted to call deleteUserById from the client-side.');
    return { error: { message: "User deletion can only be performed server-side." } };
  }

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseServiceRoleKey) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.');
    return { error: { message: "Admin client not available for user deletion." } };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logger.info(`Attempting Supabase Auth deletion for user ${userId} via Admin client.`);
  try {
    // Use the initialized admin client
    const { data: { user }, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      // Handle specific errors, e.g., user not found might not be a critical failure if DB is deleted
      if (error.message.includes('User not found')) {
        logger.warn(`User ${userId} not found in Supabase Auth (already deleted?).`);
        return { error: null }; // Treat as success if user is gone
      }
      logger.error(`Supabase Auth Admin Error deleting user ${userId}:`, error);
      return { error };
    }
    logger.info(`Successfully deleted user ${userId} from Supabase Auth via admin API.`);
    return { error: null };
  } catch (e: any) {
    logger.error(`Exception during Supabase Auth Admin deleteUser call for ${userId}:`, e);
    return { error: e };
  }
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

import { createClient } from '@supabase/supabase-js';
import { MockAuthService } from '@/services/mock-auth-service.service';

function getAuthServiceBasedOnEnvironment() {
  logger.info('using the enviroment to get the auth service based on enviroment', process.env.NEXT_PUBLIC_MOCK_AUTH);

  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    const mockAuthService = new MockAuthService()
    logger.info('using mock auth service');
    if (mockAuthService instanceof MockAuthService) {
      (mockAuthService as any).API_URL = `http://localhost:3000/api/mock-auth`;
    }
    return mockAuthService
  }

  return new SupabaseAuthService()
}