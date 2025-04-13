'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import logger from '@/utils/logger';
import { redirect } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function serverLogin(email: string, password: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error || !data.session) throw error || new Error('Authentication failed');
    
    return { 
      user: data.user, 
      session: data.session,
      error: null 
    };
  } catch (error) {
    logger.error('Login failed:', error);
    return { 
      user: null, 
      session: null,
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

export async function serverRegister(email: string, password: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authResponse = await supabase.auth.signUp({ email, password });

    if (!authResponse.data.user || !authResponse.data.session) {
      throw new Error('Registration failed');
    }
    
    return { 
      user: authResponse.data.user, 
      session: authResponse.data.session,
      error: null 
    };
  } catch (error) {
    logger.error('Registration failed:', error);
    return { 
      user: null, 
      session: null,
      error: error instanceof Error ? error.message : 'Registration failed' 
    };
  }
}

export async function serverLogout() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    await supabase.auth.signOut();
  } catch (error) {
    logger.error('Logout failed:', error);
    throw error;
  }
}

export async function serverGetSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    if (!token) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { session }, error } = await supabase.auth.getSession();
    return error ? null : session;
  } catch (error) {
    logger.error('Failed to get session:', error);
    return null;
  }
}