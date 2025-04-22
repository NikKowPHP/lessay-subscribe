'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import {
  getUserProfileAction,
  createUserProfileAction,
  updateUserProfileAction,
} from '@/lib/server-actions/user-actions';
import { SubscriptionStatus } from '@prisma/client';
import { Result } from '@/lib/server-actions/_withErrorHandling'; // Import Result type

interface UserProfileContextType {
  profile: UserProfileModel | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfileModel>) => Promise<void>;
  // saveInitialProfile is removed as creation is handled within fetchUserProfile
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
  const [loading, setLoading] = useState<boolean>(false); // Tracks profile-specific loading
  const [error, setError] = useState<string | null>(null);

  // Helper to call server actions and handle loading/errors for this context
  const callUserAction = useCallback(async <T,>(
    action: () => Promise<Result<T>>,
  ): Promise<Result<T>> => {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      if (result.error) {
        setError(result.error);
        logger.error('User action failed:', result.error);
      }
      return result;
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred during user action.';
      setError(message);
      logger.error('Unexpected error in callUserAction:', err);
      return { error: message }; // Return error structure
    } finally {
      setLoading(false);
    }
  }, []); // No external dependencies needed for this helper


  // Load user profile when auth user changes
  useEffect(() => {
    const fetchUserProfile = async (userId: string, userEmail: string) => {
      logger.info(`UserProfileProvider: Fetching profile for user ${userId}`);
      const { data, error: fetchError } = await callUserAction(() => getUserProfileAction(userId));

      if (fetchError) {
        // Error already logged by callUserAction
        setProfile(null); // Clear profile on error
        return; // Stop processing
      }

      if (data) {
        // Profile found
        setProfile(data);
        logger.info(`UserProfileProvider: Profile found for user ${userId}.`);
      } else {
        // Profile not found, attempt to create it
        logger.warn(`UserProfileProvider: Profile not found for user ${userId}, attempting creation.`);
        const { data: createdData, error: createError } = await callUserAction(() =>
          createUserProfileAction({ userId, email: userEmail })
        );

        if (createError) {
          // Error already logged by callUserAction
          setError(`Failed to create profile: ${createError}`); // Set specific error
          setProfile(null);
        } else if (createdData) {
          setProfile(createdData);
          logger.info(`UserProfileProvider: Profile created successfully for user ${userId}.`);
        } else {
          // This case indicates a problem with createUserProfileAction if no data/error returned
          logger.error(`UserProfileProvider: createUserProfileAction returned no data and no error for user ${userId}.`);
          setError('Failed to create or retrieve profile.');
          setProfile(null);
        }
      }
    };

    // Don't do anything until auth is settled
    if (authLoading) {
      setLoading(true); // Reflect that we are waiting for auth before fetching profile
      return;
    };

    if (user?.id && user.email) {
      // Only set loading true when we actually start fetching/creating
      setLoading(true);
      fetchUserProfile(user.id, user.email);
    } else {
      // No user, clear profile state
      setProfile(null);
      setError(null);
      setLoading(false); // Ensure loading is false if no user
    }
  }, [user, authLoading, callUserAction]); // Depend on user and authLoading


  // Update profile function
  const updateProfile = async (data: Partial<UserProfileModel>) => {
    if (!profile || !user?.id) {
      setError('No profile to update or user not authenticated');
      return;
    }

    const { subscriptionStatus, subscriptionEndDate, ...updateData } = data; // Exclude read-only fields
    if (Object.keys(updateData).length === 0) {
      logger.warn('updateProfile called with no updatable fields.');
      return;
    }

    const { data: updated, error: updateError } = await callUserAction(() =>
      updateUserProfileAction(user.id!, updateData) // Use non-null assertion for user.id
    );

    if (!updateError && updated) {
      setProfile(updated); // Update local state on success
      logger.info(`Profile updated successfully for user ${user.id}.`);
    }
    // Error is handled by callUserAction
  };

  // Helper function to check subscription status
  const hasActiveSubscription = (): boolean => {
    if (!profile) return false;
    const isActive = profile.subscriptionStatus === SubscriptionStatus.ACTIVE;
    const isTrial = profile.subscriptionStatus === SubscriptionStatus.TRIAL;
    const now = new Date();
    const endDate = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;
    const hasValidEndDate = endDate ? endDate > now : true;

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
        // saveInitialProfile is removed
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
// --- NEW CODE END ---
