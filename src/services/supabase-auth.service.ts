import { IAuthService } from '@/services/auth.service'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MockAuthService } from './mock-auth-service.service'
import logger from '@/utils/logger'
import { createClient } from '@supabase/supabase-js'


// Use environment variables directly for client creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let supabaseAdmin: ReturnType<typeof createClient> | null = null;
if (supabaseServiceRoleKey && typeof window === 'undefined') { // Ensure server-side context
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.info('Supabase Admin client initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Supabase Admin client:', error);
  }
} else if (supabaseServiceRoleKey && typeof window !== 'undefined') {
  logger.warn('Attempted to initialize Supabase Admin client in a browser environment. This is unsafe.');
} else if (!supabaseServiceRoleKey) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.');
}


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
    if (typeof window !== 'undefined') {
      logger.error('Attempted to call deleteUserById from the client-side.');
      return { error: { message: "User deletion can only be performed server-side." } };
    }

    if (!supabaseAdmin) {
      logger.error(`Supabase Admin client not initialized. Cannot delete user ${userId}.`);
      return { error: { message: "Admin client not available for user deletion." } };
    }

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
