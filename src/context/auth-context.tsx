'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { SupabaseAuthService } from '@/services/supabase-auth.service'
import { useRouter } from 'next/navigation'
import { MockAuthService } from '@/services/mock-auth-service.service'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isMock] = useState(() => process.env.NEXT_PUBLIC_MOCK_REPOSITORIES === 'true')
  const [authService] = useState(() => 
    isMock ? new MockAuthService() : new SupabaseAuthService()
  )

const isAdminRoute = (path: string) => {
  const adminRoutes = ['/admin', '/admin/login', '/admin/sections/dashboard', '/admin/sections/case-studies', '/admin/sections/case-study-sliders', '/admin/sections/testimonials']
  return adminRoutes.some(route => path.startsWith(route))
}

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    authService.getSession().then((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    .catch((error) => {
      setError(error instanceof Error ? error.message : 'Session error occurred')
      setLoading(false)
    })

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Get current path using window.location
        const currentPath = window.location.pathname
        console.log('is mocked', isMock)

        if (isMock && !isAdminRoute(currentPath) || (event === 'SIGNED_IN' && !isAdminRoute(currentPath))) {
          console.log('redirecting to admin dashboard')
          router.replace('/admin/sections/dashboard')
        } else if (event === 'SIGNED_OUT') {
          router.replace('/admin/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const login = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const { user, session } = await authService.login(email, password)
      setUser(user)
      setSession(session)
      if (user) {
        router.push('/admin/sections/dashboard')
      }
    } catch (error) {
      const message = error instanceof AuthError 
        ? error.message 
        : 'Failed to login'
      setError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await authService.logout()
      setUser(null)
      setSession(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Logout failed')
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      error,
      login, 
      logout,
      clearError 
    }}>
      {children}
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