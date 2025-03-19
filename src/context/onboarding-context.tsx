'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createOnboardingAction, updateOnboardingAction, getStatusAction } from '@/lib/server-actions/onboarding-actions'
import logger from '@/utils/logger'

interface OnboardingContextType {
  isOnboardingComplete: boolean
  checkOnboardingStatus: () => Promise<boolean>
  markStepComplete: (step: string) => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkOnboardingStatus = async () => {
    setLoading(true)
    try {
      const status = await getStatusAction()
      setIsOnboardingComplete(status)
      return status
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check onboarding status'
      setError(message)
      logger.error(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const markStepComplete = async (step: string) => {
    setLoading(true)
    try {
      await updateOnboardingAction(step)
      // After marking a step complete, check if onboarding is now complete
      await checkOnboardingStatus()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark step complete'
      setError(message)
      logger.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  // Check onboarding status on initial load
  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  return (
    <OnboardingContext.Provider value={{
      isOnboardingComplete,
      checkOnboardingStatus,
      markStepComplete,
      loading,
      error,
      clearError
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}