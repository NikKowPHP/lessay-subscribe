// import { User, Session } from '@supabase/supabase-js'
// import { AuthChangeEvent } from '@supabase/supabase-js'
// import { MockAuthService } from './mock-auth-service.service'
// import logger from '@/utils/logger'
// import { createClient } from '@supabase/supabase-js'

// export interface IAuthService {
//   login(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
//   register(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
//   loginWithGoogle(): Promise<void>
//   logout(): Promise<void>
//   getSession(): Promise<Session | null>
//   onAuthStateChange(callback: (event: any, session: Session | null) => Promise<void> | void): any
//   deleteUserById(userId: string): Promise<{ error: any | null }>
// } 



// // Use environment variables directly for client creation
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
// // const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''


// // let supabaseAdmin: ReturnType<typeof createClient> | null = null;
// // if (supabaseServiceRoleKey && typeof window === 'undefined') { // Ensure server-side context
// //   try {
// //     supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
// //       auth: {
// //         autoRefreshToken: false,
// //         persistSession: false
// //       }
// //     });
// //     logger.info('Supabase Admin client initialized successfully.');
// //   } catch (error) {
// //     logger.error('Failed to initialize Supabase Admin client:', error);
// //   }
// // } else if (supabaseServiceRoleKey && typeof window !== 'undefined') {
// //   logger.warn('Attempted to initialize Supabase Admin client in a browser environment. This is unsafe.');
// // } else if (!supabaseServiceRoleKey) {
// //   logger.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.');
// // }




// export function getAuthServiceBasedOnEnvironment() {
//   logger.info('using the enviroment to get the auth service based on enviroment', process.env.NEXT_PUBLIC_MOCK_AUTH);

//   if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
//     const mockAuthService = new MockAuthService()
//     logger.info('using mock auth service');
//     if (mockAuthService instanceof MockAuthService) {
//       (mockAuthService as any).API_URL = `http://localhost:3000/api/mock-auth`;
//     }
//     return mockAuthService
//   }

//   return new SupabaseAuthService()
// }
