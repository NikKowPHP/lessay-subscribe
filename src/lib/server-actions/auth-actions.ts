'use server';

import { withServerErrorHandling, Result } from './_withErrorHandling';
import logger from '@/utils/logger';
import { Session, User } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import UserService from '@/services/user.service'; // Import UserService
import { UserRepository } from '@/repositories/user.repository'; // Import UserRepository
type AuthData = { user: User | null; session: Session | null };

// LOGIN (with fallback→signup)
export async function loginAction(
  email: string,
  password: string
): Promise<Result<AuthData>> {
  return withServerErrorHandling(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error?.code === 'invalid_credentials') {
      // auto‐signup
      const { data: d2, error: e2 } = await supabase.auth.signUp({
        email,
        password,
      });
      if (e2) throw new Error(e2.message);
      return { user: d2.user, session: d2.session };
    }
    if (error) throw new Error(error.message);

    return { user: data.user, session: data.session };
  });
}

// SIGNUP
export async function registerAction(
  email: string,
  password: string
): Promise<Result<AuthData>> {
  return withServerErrorHandling(async () => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    // --- START: Create Prisma User Profile ---
    if (data.user) {
      logger.info(
        `Supabase user created: ${data.user.id}. Creating Prisma profile...`
      );
      try {
        const userService = new UserService(new UserRepository()); // Instantiate service
        await userService.createUserProfile({
          userId: data.user.id,
          email: data.user.email!,
        });
        logger.info(
          `Prisma profile created successfully for user: ${data.user.id}`
        );
      } catch (profileError: any) {
        // Log the error but don't necessarily fail the whole registration
        // The UserProfileProvider might catch it later, or we might need cleanup logic.
        logger.error(
          `Failed to create Prisma profile during registration for user ${data.user.id}:`,
          profileError
        );
        // Optionally re-throw if profile creation is absolutely critical *here*
      }
    }
    // --- END: Create Prisma User Profile ---
    return { user: data.user, session: data.session };
  });
}

// LOGOUT
export async function logoutAction(): Promise<Result<null>> {
  return withServerErrorHandling(async () => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return null;
  });
}

// GET SESSION
export async function getSessionAction(): Promise<Result<Session | null>> {
  return withServerErrorHandling(async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return session;
  });
}

export async function loginWithGoogleAction(): Promise<{
  error: AuthError | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/app/lessons`,
    },
  });
  if (error) {
    logger.error('Google login error:', error);
    return { error };
  }
  return { error: null };
}
