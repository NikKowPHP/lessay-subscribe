import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import logger from '../logger';
import { Session, SignInWithOAuthCredentials, SignInWithPasswordCredentials, SignUpWithPasswordCredentials, User } from '@supabase/supabase-js';

const MOCK_USER_ID = 'mock-user-id-12345';
const MOCK_USER_EMAIL = 'dev@example.com';
const mockUser: User = {
  id: MOCK_USER_ID,
  email: MOCK_USER_EMAIL,
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: { name: 'Dev User' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
};
// --- END: MOCK AUTH DATA --- END: MOCK AUTH DATA ---

async function createRealSupabaseServerClient(request?: NextRequest) {
  try {
    if (request) {
      // Middleware usage
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({ name, value: '', ...options });
            },
          },
          // Add global fetch options for timeout
          global: {
            fetch: (input, init) => {
              return fetch(input, {
                ...init,
                // Increase timeout to 30 seconds for proxy environments
                signal: AbortSignal.timeout(30000),
              });
            },
          },
        }
      );
    }

    // Server Component usage - now with await
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
        // Add global fetch options for timeout
        global: {
          fetch: (input, init) => {
            return fetch(input, {
              ...init,
              // Increase timeout to 30 seconds for proxy environments
              signal: AbortSignal.timeout(30000),
            });
          },
        },
      }
    );
  } catch (error) {
    logger.error('Error in createRealSupabaseServerClient:', {
      error: (error as Error).message,
    });
    throw error;
  }
}

export async function createSupabaseServerClient(request?: NextRequest) {
  const isMockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

  // If mock auth is enabled, return a modified client immediately
  if (isMockAuth && typeof window === 'undefined') { // Ensure this runs server-side only for this block
    logger.warn('MOCK AUTH ENABLED: Returning mock Supabase client for server.');

    // We still need a real client for non-auth operations (like database queries)
    // Create a real client instance but we will override its auth methods
    const realSupabaseClient = await createRealSupabaseServerClient(request);

    return {
      ...realSupabaseClient, // Spread the real client's methods
      auth: { // Override the auth object
        ...realSupabaseClient.auth, // Keep other auth methods if needed
        getUser: async () => {
          logger.debug('MOCK AUTH: getUser() called');
          return { data: { user: mockUser }, error: null };
        },
        getSession: async () => {
          logger.debug('MOCK AUTH: getSession() called');
          return { data: { session: mockSession }, error: null };
        },
       // Mock implementations for other used auth methods
       signInWithPassword: async (credentials: SignInWithPasswordCredentials) => {
         logger.debug('MOCK AUTH: signInWithPassword() called', credentials);
         // Simulate successful login for the mock user
         return { data: { user: mockUser, session: mockSession }, error: null };
       },
       signUp: async (credentials: SignUpWithPasswordCredentials) => {
         logger.debug('MOCK AUTH: signUp() called', credentials);
         // Simulate successful sign up (user exists, maybe no session yet depending on email confirm)
         // For simplicity, return the mock user but null session like a real signup without auto-confirm
         return { data: { user: mockUser, session: null }, error: null };
         // Or simulate auto-confirm:
         // return { data: { user: mockUser, session: mockSession }, error: null };
       },
       signInWithOAuth: async (credentials: SignInWithOAuthCredentials) => {
         logger.debug('MOCK AUTH: signInWithOAuth() called', credentials);
         // Cannot redirect, just simulate success
         return { data: { provider: credentials.provider, url: 'mock-oauth-url' }, error: null };
       },
       signOut: async () => {
         logger.debug('MOCK AUTH: signOut() called');
         // Simulate successful sign out
         return { error: null };
       },
        // Optionally mock other auth methods if they cause issues
        // signOut: async () => { return { error: null }; },
      },
    };
  }

  // If mock auth is disabled or running in a context where it shouldn't apply (e.g., client), create the real client
  return createRealSupabaseServerClient(request);
}

