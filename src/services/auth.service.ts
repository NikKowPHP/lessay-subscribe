import { User, Session } from '@supabase/supabase-js'

export interface IAuthService {
  login(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
  register(email: string, password: string): Promise<{ user: User | null; session: Session | null }>
  loginWithGoogle(): Promise<void>
  logout(): Promise<void>
  getSession(): Promise<Session | null>
  onAuthStateChange(callback: (event: any, session: Session | null) => Promise<void> | void): any
} 