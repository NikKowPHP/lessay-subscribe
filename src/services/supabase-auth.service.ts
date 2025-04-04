import { IAuthService } from '@/services/auth.service'
import { supabase } from '@/repositories/supabase/supabase'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { MockAuthService } from './mock-auth-service.service'

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
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return new MockAuthService()
  }
  return new SupabaseAuthService()
}