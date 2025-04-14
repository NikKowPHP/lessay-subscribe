import { User, Session } from '@supabase/supabase-js'
import { AuthChangeEvent } from '@supabase/supabase-js'
import { MockAuthService } from './mock-auth-service.service'
import logger from '@/utils/logger'
import { createClient } from '@supabase/supabase-js'

export interface IAuthService {
  login(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
  register(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
  loginWithGoogle(): Promise<void>
  logout(): Promise<void>
  getSession(): Promise<Session | null>
  onAuthStateChange(callback: (event: any, session: Session | null) => Promise<void> | void): any
  deleteUserById(userId: string): Promise<{ error: any | null }>
} 



// Use environment variables directly for client creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// let supabaseAdmin: ReturnType<typeof createClient> | null = null;
// if (supabaseServiceRoleKey && typeof window === 'undefined') { // Ensure server-side context
//   try {
//     supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
//       auth: {
//         autoRefreshToken: false,
//         persistSession: false
//       }
//     });
//     logger.info('Supabase Admin client initialized successfully.');
//   } catch (error) {
//     logger.error('Failed to initialize Supabase Admin client:', error);
//   }
// } else if (supabaseServiceRoleKey && typeof window !== 'undefined') {
//   logger.warn('Attempted to initialize Supabase Admin client in a browser environment. This is unsafe.');
// } else if (!supabaseServiceRoleKey) {
//   logger.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.');
// }


export class SupabaseAuthService implements IAuthService {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('login', data, error)
    if (error) throw new Error(error.message)
    return data
  }

  async register(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    console.log('register', data, error)
    if (error) throw new Error(error.message)
    return data
  }

  async loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app/lessons`
      }
    })

    if (error) throw new Error(error.message)
    // No need to return data as this will redirect the browser
  }

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    return session
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void> | void) {
    return supabase.auth.onAuthStateChange(callback)
  }


  async deleteUserById(userId: string): Promise<{ error: any | null }> {
    // This method MUST run on the server and use the admin client

    // Check 1: Ensure running on the server
    if (typeof window !== 'undefined') {
      logger.error('Attempted to call deleteUserById from the client-side.');
      return { error: { message: "User deletion can only be performed server-side." } };
    }

    // Check 2: Ensure service role key is available
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseServiceRoleKey) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.');
      // Return the specific error message the tests were unexpectedly getting
      return { error: { message: "Admin client not available for user deletion." } };
    }

    // Initialize admin client *inside* the method
    let adminClient: ReturnType<typeof createClient> | null = null;
    try {
      // Use the imported createClient (which will be mocked in tests)
      adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      // Optional: Add a log here if needed, but not strictly necessary
      // logger.info('Supabase Admin client initialized for deleteUserById.');
    } catch (error) {
      logger.error('Failed to initialize Supabase Admin client for deleteUserById:', error);
      // Return a more specific error if initialization itself fails
      return { error: { message: "Failed to initialize admin client for deletion." } };
    }

    // Check 3: Ensure client was actually created (might be redundant if createClient throws)
    if (!adminClient) {
        // This path might be less likely if createClient throws, but good for safety
        logger.error(`Supabase Admin client could not be initialized (returned null). Cannot delete user ${userId}.`);
        return { error: { message: "Admin client failed to initialize for user deletion." } };
    }


    logger.info(`Attempting Supabase Auth deletion for user ${userId} via Admin client.`);
    try {
      // Use the locally initialized admin client
      const { data: { user }, error } = await adminClient.auth.admin.deleteUser(userId); // Use adminClient

      if (error) {
        // Handle specific errors, e.g., user not found
        // Check for Supabase specific error structure if needed, otherwise message check is okay
        if (error.message && error.message.includes('User not found')) {
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
}


export function getAuthServiceBasedOnEnvironment() {
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
