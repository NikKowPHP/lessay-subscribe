'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import logger from '@/utils/logger'
import { useAppInitializer } from '@/context/app-initializer-context' // Import the hook

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const { login, register, error, loading: authActionLoading, user, clearError } = useAuth() // Renamed loading
  const { status: appInitializerStatus } = useAppInitializer(); // Get app initializer status

  // Determine overall loading state
  const isLoading = authActionLoading || appInitializerStatus === 'initializing';

  useEffect(() => {
    // Redirect logic remains the same, but might be handled by AppInitializer now
    if (user && appInitializerStatus === 'idle') { // Ensure initializer is idle before redirecting
      // Redirect logic is now primarily handled by AppInitializerProvider's redirection effect
      // router.push('/app/lessons'); // Keep this as a fallback? Or remove if initializer handles it reliably.
      logger.info("LoginPage: User exists and initializer idle, relying on AppInitializer for redirect.");
    }
  }, [user, appInitializerStatus, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    // Prevent action if app is still initializing
    if (appInitializerStatus === 'initializing') {
      logger.warn("Login attempt blocked: App Initializer is still running.");
      // Optionally show a toast or message
      return;
    }
    try {
      await login(email, password)
      // Navigation is handled in the AuthContext or AppInitializer
    } catch (error: any) {
      logger.log('Login failed:', error)

      // Auto-registration logic remains
      if (error.message?.includes('Invalid login credentials') ||
        error.message?.includes('user not found')) {
        try {
          setIsRegistering(true)
          logger.log('Attempting to register instead...')
          await register(email, password)
          // Registration successful, navigation handled elsewhere
        } catch (registerError) {
          logger.log('Registration failed:', registerError)
          setIsRegistering(false)
        }
      }
    }
  }

  // const handleGoogleLogin = async () => {
  //   clearError()
  //   if (appInitializerStatus === 'initializing') {
  //       logger.warn("Google login attempt blocked: App Initializer is still running.");
  //       return;
  //   }
  //   try {
  //     await loginWithGoogle()
  //     // Redirect is handled by Supabase OAuth
  //   } catch (error) {
  //     logger.log('Google login failed:', error)
  //   }
  // }

  // Determine button text based on loading states
  let buttonText = 'Continue';
  if (appInitializerStatus === 'initializing') {
    buttonText = 'Initializing App...';
  } else if (authActionLoading) {
    buttonText = isRegistering ? 'Creating account...' : 'Signing in...';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegistering ? 'Creating your account' : 'Sign in to your account'}
          </h2>
          {isRegistering && (
            <p className="mt-2 text-center text-sm text-gray-600">
              We're creating a new account for you...
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Use combined loading state
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading} // Use combined loading state
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              disabled={isLoading} // Use combined loading state
            >
              {/* Display text based on combined loading state */}
              {isLoading && appInitializerStatus === 'initializing' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {buttonText}
                </span>
              ) : isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {buttonText}
                </span>
              ) : (
                buttonText
              )}
            </button>
          </div>

          {/* Google Login Button Placeholder */}
          {/* <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              disabled={isLoading} // Use combined loading state
            >
              Sign in with Google
            </button>
          </div> */}

          <div className="text-sm text-center text-gray-600">
            Enter your email and password to continue. If you don't have an account yet, we'll create one for you.
          </div>
        </form>
      </div>
    </div>
  )
}
// --- NEW CODE END ---
