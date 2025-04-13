import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { MockAuthService } from './mock-auth-service.service'
import logger from '@/utils/logger'
import { createClient } from '@supabase/supabase-js'


export interface IAuthService {
  // loginWithGoogle(): Promise<void>
  logout(): Promise<void>
  getSession(): Promise<Session | null>
  onAuthStateChange(callback: (event: any, session: Session | null) => Promise<void> | void): any
  deleteUserById(userId: string): Promise<{ error: any | null }>
} 

// Use environment variables directly for client creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  private client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await this.client.auth.getSession()
    if (error) {
      logger.error('Error getting session:', error)
      throw error
    }
    return session
  }

  async loginWithPassword(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.client.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async logout() {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void> | void) {
    return this.client.auth.onAuthStateChange(callback)
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

export function getAuthServiceBasedOnEnvironment(accessToken?: string) {
  logger.info('using the environment to get the auth service based on environment', process.env.NEXT_PUBLIC_MOCK_AUTH);

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
