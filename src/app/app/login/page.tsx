'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import logger from '@/utils/logger'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const { login, register, error, loading, user, clearError } = useAuth()

  useEffect(() => {
    console.log('user', user)
    if (user) {
      router.push('/app')
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      // Navigation is handled in the AuthContext
    } catch (error: any) {
      logger.log('Login failed:', error)
      
      // Check if error is because user doesn't exist
      if (error.message?.includes('Invalid login credentials') || 
          error.message?.includes('user not found')) {
        try {
          setIsRegistering(true)
          logger.log('Attempting to register instead...')
          await register(email, password)
          // Registration successful, navigation handled in the AuthContext
        } catch (registerError) {
          logger.log('Registration failed:', registerError)
          setIsRegistering(false)
        }
      }
    }
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              disabled={loading}
            >
              {loading 
                ? isRegistering ? 'Creating account...' : 'Signing in...' 
                : 'Sign in'}
            </button>
          </div>
          <div className="text-sm text-center text-gray-600">
            Enter your email and password to sign in. If you don't have an account yet, we'll create one for you.
          </div>
        </form>
      </div>
    </div>
  )
} 