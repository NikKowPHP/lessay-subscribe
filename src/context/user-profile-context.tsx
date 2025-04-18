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
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfileModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  

  // Load user profile when auth user changes
  useEffect(() => {
    // don't touch anything until auth has finished checking
    if (authLoading) return;

    if (user?.id ) {
      fetchUserProfile(user.id);
    } else {
      setProfile(null);
      setProfile(null);
      setError(null);
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // Call the action, which now handles profile creation internally if needed
      const { data, error: fetchError } = await getUserProfileAction(userId);

      if (fetchError) {
        setError(fetchError);
        logger.error('Error fetching user profile:', fetchError);
        setProfile(null); // Clear profile on error
      } else {
        // Set the profile (it will be the existing one or the newly created one)
        setProfile(data || null);
        if (data) {
          logger.info(`Profile loaded/created successfully for user ${userId}.`);
        } else {
          // This case should ideally not happen if auth is successful,
          // as getUserProfile now attempts creation. Log if it does.
          logger.warn(`getUserProfileAction returned null data for user ${userId} despite successful auth.`);
        }
      }
    } catch (err: any) {
      // Catch any unexpected errors during the process (e.g., network issues)
      logger.error('Unexpected error in fetchUserProfile:', err);
      setError(err.message || 'An unexpected error occurred while fetching the profile.');
      setProfile(null);
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
    const { data, error: createError } = await createUserProfileAction({
      userId: user.id,
      email,
    });
    setLoading(false);

    if (createError) {
      logger.error('Error creating user profile:', createError);
      setError(createError);
      return null;
    }
    return data!;
  };

  const updateProfile = async (data: Partial<UserProfileModel>) => {
    if (!profile || !user?.id) {
      setError('No profile to update or user not authenticated');
      return;
    }

    // strip out any fields we don't want sent
    const { subscriptionStatus, subscriptionEndDate, ...updateData } = data;
    if (Object.keys(updateData).length === 0) {
      logger.warn('updateProfile called with no updatable fields.');
      return;
    }

    setLoading(true);
    const { data: updated, error: updateError } = await updateUserProfileAction(
      user.id,
      updateData
    );
    setLoading(false);

    if (updateError) {
      logger.error('Error updating user profile:', updateError);
      setError(updateError);
      return;
    }

    setProfile(updated!);
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
