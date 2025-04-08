'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { UserProfileModel } from '@/models/AppAllModels.model'
import logger from '@/utils/logger'
import { getUserProfileAction, createUserProfileAction, updateUserProfileAction } from '@/lib/server-actions/user-actions'

interface UserProfileContextType {
  profile: UserProfileModel | null
  loading: boolean
  error: string | null
  updateProfile: (data: Partial<UserProfileModel>) => Promise<void>
  saveInitialProfile: (email: string) => Promise<void>
  clearError: () => void
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfileModel | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Load user profile when auth user changes
  useEffect(() => {
    if (user?.id && user.email) {
      fetchUserProfile(user.id)
    } else {
      setProfile(null)
    }
  }, [user])

  const fetchUserProfile = async (userId: string) => {
    setLoading(true)
    try {
      // here we should check if it exists if not create a new one 
      logger.info('get user profile in context', userId);
      const userProfile = await getUserProfileAction(userId)
      debugger
      logger.info('get user profile in context', userProfile);
      if (!userProfile && user?.email) {
        saveInitialProfile(user?.email)
      }
      setProfile(userProfile)
    } catch (error) {
      logger.error('Error fetching user profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const saveInitialProfile = async (email: string) => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    try {
      const initialProfile = {
        userId: user.id,
        email,
        onboardingCompleted: false,
      }

      const newProfile = await createUserProfileAction(initialProfile)
      if (newProfile) {
        setProfile(newProfile)
      } else {
        throw new Error('Failed to create user profile')
      }
    } catch (error) {
      logger.error('Error creating user profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to create profile')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: Partial<UserProfileModel>) => {
    if (!profile || !user?.id) {
      setError('No profile to update or user not authenticated')
      return
    }

    setLoading(true)
    try {
      const updatedProfile = await updateUserProfileAction(user.id, data)
      if (updatedProfile) {
        setProfile(updatedProfile)
      } else {
        throw new Error('Failed to update user profile')
      }
    } catch (error) {
      logger.error('Error updating user profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to update profile')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        updateProfile,
        saveInitialProfile,
        clearError
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export const useUserProfile = () => {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
