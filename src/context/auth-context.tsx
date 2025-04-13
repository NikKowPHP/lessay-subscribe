'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import logger from '@/utils/logger'
import { UserProfileProvider } from '@/context/user-profile-context'
import { 
  serverLogin, 
  serverRegister, 
  serverLogout,
  serverGetSession
} from '@/lib/server-actions/auth-actions'
import Cookies from 'js-cookie'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  clearError: () => void
}

export const ACCESS_TOKEN_COOKIE_NAME = 'sb-access-token'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await serverGetSession()
        if (session) {
          setSession(session)
          setUser(session.user)
          Cookies.set(ACCESS_TOKEN_COOKIE_NAME, session.access_token, {
            expires: session.expires_in / 86400,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          })
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Session error')
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const { user, session, error } = await serverLogin(email, password)
      if (error || !user || !session) throw new Error(error || 'Authentication failed')
      
      setUser(user)
      setSession(session)
      Cookies.set(ACCESS_TOKEN_COOKIE_NAME, session.access_token, {
        expires: session.expires_in / 86400,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const { user, session, error } = await serverRegister(email, password)
      if (error) throw new Error(error)
      if (!user || !session) throw new Error('User not found')
      
      setUser(user)
      setSession(session)
      Cookies.set(ACCESS_TOKEN_COOKIE_NAME, session.access_token, {
        expires: session.expires_in / 86400,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      router.push('/app/onboarding')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setError(null)
    setLoading(true)
    try {
      await serverLogout()
      setUser(null)
      setSession(null)
      Cookies.remove(ACCESS_TOKEN_COOKIE_NAME)
      router.push('/app/login')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed')
    } finally {
      setLoading(false)
    }
  }

  const getAccessToken = async () => {
    const session = await serverGetSession();
    return session?.access_token || null;
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      error,
      login,
      register,
      logout,
      getAccessToken,
      clearError
    }}>
      <UserProfileProvider>
        {children}
      </UserProfileProvider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 
