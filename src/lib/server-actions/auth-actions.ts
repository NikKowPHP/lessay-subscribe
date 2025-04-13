'use server';

import { SupabaseAuthService } from '@/services/supabase-auth.service';
import { cookies } from 'next/headers';
import logger from '@/utils/logger';
import { redirect } from 'next/navigation';

const authService = new SupabaseAuthService();

async function setAuthCookie(token: string, expiresIn: number) {
  const cookieStore = await cookies();
  cookieStore.set('sb-access-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn,
    path: '/'
  });
}

export async function serverLogin(email: string, password: string) {
  try {
    const { session, user } = await authService.loginWithPassword(email, password);
    if (!session) throw new Error('Authentication failed');
    
    setAuthCookie(session.access_token, session.expires_in);
    return { user, error: null };
  } catch (error) {
    logger.error('Login failed:', error);
    return { user: null, error: error instanceof Error ? error.message : 'Authentication failed' };
  }
}

export async function serverRegister(email: string, password: string) {
  try {
    const { user } = await authService.signUp(email, password);
    if (!user) throw new Error('Registration failed');
    
    return { user, error: null };
  } catch (error) {
    logger.error('Registration failed:', error);
    return { user: null, error: error instanceof Error ? error.message : 'Registration failed' };
  }
}

export async function serverLogout() {
  try {
    await authService.logout();
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    redirect('/app/login');
  } catch (error) {
    logger.error('Logout failed:', error);
    throw error;
  }
}

export async function serverGetSession() {
  try {
    return await authService.getSession();
  } catch (error) {
    logger.error('Failed to get session:', error);
    return null;
  }
}