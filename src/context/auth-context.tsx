'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import React  from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
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
  const isMock = process.env.NEXT_PUBLIC_IS_MOCK === 'true';
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
      getSessionAction().then(({ data, error }) => {
        if (error) {
          setError(error)
        } else {
          setSession(data ?? null)
          setUser(data?.user ?? null)
        }
      }).finally(() => setLoading(false))

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, changedSession) => {
          // Only update state if the component is still mounted
          if (isMounted.current) {
              logger.log("AuthProvider Effect: onAuthStateChange fired", event, changedSession);
              setSession(changedSession);
              setUser(changedSession?.user ?? null);
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
    }, [router, supabase.auth]);
  
    const checkErrorMessageAndGiveTheUserError = (errorMessage: string) => {
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials')) {
        return 'Invalid credentials. Please try again or sign up.';
      }
      return errorMessage;
    }

    const login = async (email: string, password: string) => {
      setLoading(true)
      const { data, error: loginError } = await loginAction(email, password); // Renamed error
      if (loginError) {
        const userFriendlyError = checkErrorMessageAndGiveTheUserError(loginError);
        setError(userFriendlyError);
        throw new Error(userFriendlyError); // Throw the user-friendly message
      }
      setUser(data!.user)
      setSession(data!.session)
      setError(null)
      setLoading(false)
      router.push('/app/lessons');
    }

    const register = async (email: string, password: string) => {
      setLoading(true)
    
      const { data, error: registerError } = await registerAction(email, password); // Renamed error
      if (registerError) {
        setError(registerError);
        throw new Error(registerError);
      }
      setUser(data!.user)
      setSession(data!.session)
      setError(null)
      setLoading(false)
      router.push('/app/onboarding');
    }

  

    const loginWithGoogle = async () => {
      if (!isMounted.current) return;
      setError(null)
      setLoading(true)
      try {
        const { error: actionError } = await loginWithGoogleAction()
        if (actionError) {
       
          setError(actionError.message); // Set error state
          throw new Error(actionError.message); // Also throw for consistency
        }
        // No need to set user/session here as it will be handled by the auth state change
      } catch (caughtError: any) {
          if (isMounted.current) {
              const message = caughtError?.message ? caughtError.message : 'Google login failed';
          
              setError(message); // Set error state
              throw new Error(message); // Re-throw
          }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

  

    const logout = async (options: { redirect?: boolean } = { redirect: true }) => {
      if (!isMounted.current) return;
      setLoading(true);
      setError(null); // Clear previous errors

      try {
        // Attempt server-side logout, but don't block client-side cleanup if it fails
        const { error: serverLogoutError } = await logoutAction();
        if (serverLogoutError) {
          // Log the error, but proceed with client-side cleanup
          logger.warn('Server-side logout action failed (might be expected if user was just deleted):', serverLogoutError);
          // Optionally set the error state if it's not an expected "user not found" type error
          // setError(serverLogoutError.message);
        }
      } catch (caughtError: any) {
        // Catch errors from the action call itself
        logger.error('Error calling logoutAction:', caughtError);
        // setError(caughtError.message || 'Logout failed');
      } finally {
        // Always clear client-side state regardless of server action outcome
        if (isMounted.current) {
          logger.info('Clearing client-side auth state in logout function.');
          setUser(null);
          setSession(null);
          setLoading(false);

          const currentPath = window.location.pathname;
          if (options.redirect && currentPath.startsWith('/app')) {
              logger.info("AuthProvider logout: Redirecting to /app/login");
              router.replace('/app/login'); // Use replace to avoid back button issues
          }
        }
      }
    };
    // --- NEW CODE END ---
  
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
