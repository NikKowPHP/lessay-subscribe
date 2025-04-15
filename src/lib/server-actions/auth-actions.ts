'use server';

import logger from '@/utils/logger';
import {  Session, User } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/utils/supabase/server';

function getSupabaseClient() {
  return createSupabaseServerClient();
}

export async function loginAction(email: string, password: string): Promise<{ data: { user: User | null; session: Session | null }, error: AuthError | null }> {
  const supabase = await getSupabaseClient();
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

