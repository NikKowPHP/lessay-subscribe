'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import {
  getUserProfileAction,
  createUserProfileAction,
  updateUserProfileAction,
} from '@/lib/server-actions/user-actions';

import { SubscriptionStatus } from '@prisma/client'; // Import if needed for default values

interface UserProfileContextType {
  profile: UserProfileModel | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfileModel>) => Promise<void>;
  saveInitialProfile: (email: string) => Promise<UserProfileModel | null>;
  clearError: () => void;
  hasActiveSubscription: () => boolean;

}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined
);

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load user profile when auth user changes
  useEffect(() => {
    if (user?.id && user.email) {
      fetchUserProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      // here we should check if it exists if not create a new one
      logger.info('get user profile in context', userId);
      let userProfile = await getUserProfileAction(userId);
      logger.info('get user profile in context', userProfile);
      if (!userProfile && user?.email) {
        userProfile = await saveInitialProfile(user?.email);
      }
      setProfile(userProfile);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const saveInitialProfile = async (
    email: string
  ): Promise<UserProfileModel | null> => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    try {
      const initialProfile = {
        userId: user.id,
        email,
        onboardingCompleted: false,
      };

      const userProfile = await createUserProfileAction(initialProfile);
      return userProfile;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create profile'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfileModel>) => {
    if (!profile || !user?.id) {
      setError('No profile to update or user not authenticated');
      return;
    }

    setLoading(true);
    try {
      const { subscriptionStatus, subscriptionEndDate, ...updateData } = data;
      if (Object.keys(updateData).length === 0) {
        logger.warn("updateProfile called with no updatable fields.");
        setLoading(false);
        return; // Nothing to update
      }
      const updatedProfile = await updateUserProfileAction(user.id, updateData);
      if (updatedProfile) {
        setProfile(updatedProfile);
      } else {
        throw new Error('Failed to update user profile');
      }
    } catch (error) {
      logger.error('Error updating user profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };


  // Helper function to check subscription status
  const hasActiveSubscription = (): boolean => {
    if (!profile) return false;
    const isActive = profile.subscriptionStatus === SubscriptionStatus.ACTIVE;
    const isTrial = profile.subscriptionStatus === SubscriptionStatus.TRIAL;
    const now = new Date();
    const endDate = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;
    const hasValidEndDate = endDate ? endDate > now : true; // Assume valid if no end date (e.g., ongoing trial/active)

    return (isActive || isTrial) && hasValidEndDate;
  };

  const clearError = () => setError(null);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        updateProfile,
        saveInitialProfile,
        hasActiveSubscription,
        clearError,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
