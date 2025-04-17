'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import React  from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { MockAuthService } from '@/services/mock-auth-service.service'
import logger from '@/utils/logger'
import { UserProfileProvider } from '@/context/user-profile-context'
import { loginAction, registerAction, loginWithGoogleAction, logoutAction, getSessionAction } from '@/lib/server-actions/auth-actions'
import { createClient } from '@/utils/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isMock] = useState(() => process.env.NEXT_PUBLIC_MOCK_AUTH === 'true')
  const supabase = useRef(createClient()).current;


  logger.log('isMock', isMock)


  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

    const isMounted = useRef(true);

    useEffect(() => {
      isMounted.current = true; 
      logger.log("AuthProvider Effect: Mounting / Running");
  
      setLoading(true); 
      getSessionAction().then((initialSession) => {
        if (isMounted.current) {
          logger.log("AuthProvider Effect: getSessionAction resolved", initialSession);
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false); 
        }
      })
      .catch((err) => { 
        if (isMounted.current) {
          logger.error("AuthProvider Effect: getSessionAction failed", err);
          setError(err instanceof Error ? err.message : 'Session error occurred');
          setLoading(false); 
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, changedSession) => {
          if (isMounted.current) {
              logger.log("AuthProvider Effect: onAuthStateChange fired", event, changedSession);
              setSession(changedSession);
              setUser(changedSession?.user ?? null);
  
              const currentPath = window.location.pathname; // Safe to access here if needed
              if (event === 'SIGNED_OUT' && currentPath.startsWith('/app')) {
                  logger.log("AuthProvider Effect: Redirecting on SIGNED_OUT");
                  router.replace('/app/login');
              }
          } else {
              logger.log("AuthProvider Effect: onAuthStateChange fired AFTER unmount, ignoring.");
          }
        }
      );
  
      return () => {
        logger.log("AuthProvider Effect: Unmounting");
        isMounted.current = false; // Set false on cleanup
        subscription.unsubscribe();
      };
    }, [router, supabase]);
  
    const checkErrorMessageAndGiveTheUserError = (errorMessage: string) => {
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
        return 'Invalid credentials. Please try again or sign up.';
      }
      return errorMessage;
    }

    const login = async (email: string, password: string) => {
      // Check mount status at the beginning of async operations
      if (!isMounted.current) return;
      setError(null)
      setLoading(true)
      try {
        const { data, error: actionError } = await loginAction(email, password) // Rename error variable
        if (actionError) {
          setError(checkErrorMessageAndGiveTheUserError(actionError.message));
        }
        if (isMounted.current) {
          setUser(data.user);
          setSession(data.session);
          if (data.user) {
            router.push('/app/lessons');
          }
        }
      } catch (caughtError: any) {
          if (isMounted.current) {
              const message = caughtError?.message ? caughtError.message : 'Failed to login';
              setError(message);
          }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    const register = async (email: string, password: string) => {
      if (!isMounted.current) return;
      setError(null)
      setLoading(true)
      try {
        const { data, error: actionError } = await registerAction(email, password)
        if (actionError) {
          setError(actionError.message);
        }
        if (isMounted.current) {
          setUser(data.user);
          setSession(data.session);
          if (data.user) {
            router.push('/app/onboarding'); // Redirect to onboarding instead of lessons
          }
        }
      } catch (caughtError: any) {
          if (isMounted.current) {
              const message = caughtError?.message ? caughtError.message : 'Registration failed';
              setError(message);
          }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }
  

    const loginWithGoogle = async () => {
      if (!isMounted.current) return;
      setError(null)
      setLoading(true)
      try {
        const { error: actionError } = await loginWithGoogleAction()
        if (actionError) {
          setError(actionError.message);
        }
        // No need to set user/session here as it will be handled by the auth state change
      } catch (caughtError: any) {
          if (isMounted.current) {
              const message = caughtError?.message ? caughtError.message : 'Google login failed';
              setError(message);
          }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }
  

    const logout = async () => {
      if (!isMounted.current) return;
      setError(null)
      try {
        const { error: actionError } = await logoutAction()
        if (actionError) {
           if (isMounted.current) {
              setError(actionError.message);
           }
          return;
        }
        if (isMounted.current) {
          setUser(null);
          setSession(null);
        }
      } catch (caughtError: any) { 
          if (isMounted.current) {
              setError(caughtError instanceof Error ? caughtError.message : 'Logout failed');
          }
      }
    }
  
    const clearError = () => {
        if (isMounted.current) {
          setError(null);
        }
    }
  

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      error,
      login,
      register,
      loginWithGoogle,
      logout,
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
