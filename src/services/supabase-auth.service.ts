import { IAuthService } from '@/services/auth.service'
import { supabase } from '@/repositories/supabase/supabase'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MockAuthService } from './mock-auth-service.service'
import logger from '@/utils/logger'

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
}

export function getAuthServiceBasedOnEnvironment() {
  logger.info('using the enviroment to get the auth service based on enviroment', process.env.NEXT_PUBLIC_MOCK_AUTH);

  if(process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    const mockAuthService = new MockAuthService()
    logger.info('using mock auth service');
    if (mockAuthService instanceof MockAuthService) {
      (mockAuthService as any).API_URL = `http://localhost:3000/api/mock-auth`;
    }
    return mockAuthService
  }

  return new SupabaseAuthService()
}
