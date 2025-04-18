'use server';

import logger from '@/utils/logger';
import {  Session, User } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/server';

function getSupabaseClient() {
  return createSupabaseServerClient();
}


export type AuthResult = {
  data: { user: User | null; session: Session | null };
  error: AuthError | null;
};

export async function loginAction(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // fall back to a server‑side registration, if you like:
    if (error?.code === 'invalid_credentials') {
      const { data: regData, error: regErr } = await supabase.auth.signUp({ email, password });
      return { data: regData, error: regErr };
    }

    return {
      data: {
        user: data.user,
        session: data.session,
      },
      error,
    };
  } catch (err: any) {
    // network or unexpected
    return {
      data: { user: null, session: null },
      error: { message: err.message, status: 500, name: 'ServerError' } as AuthError,
    };
  }
}

export async function registerAction(email: string, password: string): Promise<{ data: { user: User | null; session: Session | null }, error: AuthError | null }> {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('Logout error:', error);
    return { error };
  }
  return { error: null };
}

export async function getSessionAction(): Promise<Session | null> {
  const supabase = await getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    logger.error('Get session error:', error);
    return null;
  }
  return session;
}

