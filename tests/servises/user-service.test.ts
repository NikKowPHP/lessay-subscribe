// File: /tests/lib/server-actions/user-actions.test.ts

import {
  getUserProfileAction,
  createUserProfileAction,
  updateUserProfileAction,
  deleteUserProfileAction,
} from '@/lib/server-actions/user-actions';
import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { SubscriptionStatus } from '@prisma/client';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';

// --- Mocks ---

// Mock UserService and its methods (via mocking the repository it uses)
jest.mock('@/services/user.service');

// Mock UserRepository and its methods
jest.mock('@/repositories/user.repository');
const mockGetUserProfile = jest.fn();
const mockCreateUserProfile = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockDeleteUserProfile = jest.fn();
UserRepository.prototype.getUserProfile = mockGetUserProfile;
UserRepository.prototype.createUserProfile = mockCreateUserProfile;
UserRepository.prototype.updateUserProfile = mockUpdateUserProfile;
UserRepository.prototype.deleteUserProfile = mockDeleteUserProfile;

// Mock Supabase Server Client and Auth methods
jest.mock('@/utils/supabase/server');
const mockGetSession = jest.fn();
const mockAuthAdminDeleteUser = jest.fn(); // Assuming admin client is used for deletion
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    admin: { // Mock admin interface if used by repository
      deleteUser: mockAuthAdminDeleteUser,
    }
  },
} as unknown as SupabaseClient; // Cast to avoid full type implementation
(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Mock Next.js Cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock Logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(), // Add log if used
}));

// --- Test Data ---
const mockUserId = 'user-test-123';
const otherUserId = 'user-other-456';

const mockUserProfile: UserProfileModel = {
  id: mockUserId,
  userId: mockUserId,
  email: 'test@example.com',
  name: 'Test User',
  nativeLanguage: 'English',
  targetLanguage: 'German',
  proficiencyLevel: 'beginner',
  learningPurpose: 'general',
  onboardingCompleted: true,
  initialAssessmentCompleted: true,
  subscriptionStatus: SubscriptionStatus.ACTIVE,
  subscriptionEndDate: new Date(Date.now() + 86400000), // Tomorrow
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser: User = {
  id: mockUserId,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'test@example.com',
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
  expires_in: 3600,
  token_type: 'bearer',
};

const mockAuthError = new Error('Authentication required.');
const mockUnauthorizedError = new Error('Unauthorized');
const mockNotFoundError = new Error('User profile not found');
const mockDeleteError = new Error('Failed to delete profile');

// --- Test Suite ---
describe('User Server Actions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockGetUserProfile.mockResolvedValue(mockUserProfile);
    mockCreateUserProfile.mockResolvedValue(mockUserProfile);
    mockUpdateUserProfile.mockResolvedValue(mockUserProfile);
    mockDeleteUserProfile.mockResolvedValue(undefined); // Resolves void on success
  });

  // --- getUserProfileAction ---
  describe('getUserProfileAction', () => {
    it('should get the user profile for the currently logged-in user', async () => {
      const profile = await getUserProfileAction(mockUserId);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(profile).toEqual(mockUserProfile);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should throw Unauthorized error when trying to get another user profile', async () => {
      await expect(getUserProfileAction(otherUserId)).rejects.toThrow(mockUnauthorizedError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Unauthorized attempt to get profile. Logged in user: ${mockUserId}, Requested user: ${otherUserId}`
      );
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });

    it('should throw Authentication error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });

      await expect(getUserProfileAction(mockUserId)).rejects.toThrow(mockAuthError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserProfile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getUserProfileAction:',
        expect.objectContaining({ error: mockAuthError.message })
      );
    });

     it('should throw Authentication error if session is null', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      await expect(getUserProfileAction(mockUserId)).rejects.toThrow(mockAuthError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserProfile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getUserProfileAction:',
        expect.objectContaining({ error: mockAuthError.message })
      );
    });

    it('should return null if user profile is not found in repository', async () => {
      mockGetUserProfile.mockResolvedValueOnce(null);

      const profile = await getUserProfileAction(mockUserId);

      expect(profile).toBeNull();
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).not.toHaveBeenCalled(); // Service/Repo handles not found, action returns null
    });

    it('should return null and log error for general repository errors', async () => {
      const repoError = new Error('Database connection failed');
      mockGetUserProfile.mockRejectedValueOnce(repoError)// File: /tests/lib/server-actions/user-actions.test.ts

      import {
        getUserProfileAction,
        createUserProfileAction,
        updateUserProfileAction,
        deleteUserProfileAction,
      } from '@/lib/server-actions/user-actions';
      import UserService from '@/services/user.service';
      import { UserRepository } from '@/repositories/user.repository';
      import { UserProfileModel } from '@/models/AppAllModels.model';
      import logger from '@/utils/logger';
      import { revalidatePath } from 'next/cache';
      import { createSupabaseServerClient } from '@/utils/supabase/server';
      import { SubscriptionStatus } from '@prisma/client';
      import { SupabaseClient, Session, User } from '@supabase/supabase-js';
      
      // --- Mocks ---
      
      // Mock UserService and its methods (via mocking the repository it uses)
      jest.mock('@/services/user.service');
      
      // Mock UserRepository and its methods
      jest.mock('@/repositories/user.repository');
      const mockGetUserProfile = jest.fn();
      const mockCreateUserProfile = jest.fn();
      const mockUpdateUserProfile = jest.fn();
      const mockDeleteUserProfile = jest.fn();
      UserRepository.prototype.getUserProfile = mockGetUserProfile;
      UserRepository.prototype.createUserProfile = mockCreateUserProfile;
      UserRepository.prototype.updateUserProfile = mockUpdateUserProfile;
      UserRepository.prototype.deleteUserProfile = mockDeleteUserProfile;
      
      // Mock Supabase Server Client and Auth methods
      jest.mock('@/utils/supabase/server');
      const mockGetSession = jest.fn();
      const mockAuthAdminDeleteUser = jest.fn(); // Assuming admin client is used for deletion
      const mockSupabaseClient = {
        auth: {
          getSession: mockGetSession,
          admin: { // Mock admin interface if used by repository
            deleteUser: mockAuthAdminDeleteUser,
          }
        },
      } as unknown as SupabaseClient; // Cast to avoid full type implementation
      (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
      
      // Mock Next.js Cache
      jest.mock('next/cache', () => ({
        revalidatePath: jest.fn(),
      }));
      
      // Mock Logger
      jest.mock('@/utils/logger', () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(), // Add log if used
      }));
      
      // --- Test Data ---
      const mockUserId = 'user-test-123';
      const otherUserId = 'user-other-456';
      
      const mockUserProfile: UserProfileModel = {
        id: mockUserId,
        userId: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        nativeLanguage: 'English',
        targetLanguage: 'German',
        proficiencyLevel: 'beginner',
        learningPurpose: 'general',
        onboardingCompleted: true,
        initialAssessmentCompleted: true,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockUser: User = {
        id: mockUserId,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'test@example.com',
      };
      
      const mockSession: Session = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: mockUser,
        expires_in: 3600,
        token_type: 'bearer',
      };
      
      const mockAuthError = new Error('Authentication required.');
      const mockUnauthorizedError = new Error('Unauthorized');
      const mockNotFoundError = new Error('User profile not found');
      const mockDeleteError = new Error('Failed to delete profile');
      
      // --- Test Suite ---
      describe('User Server Actions', () => {
        beforeEach(() => {
          // Reset mocks before each test
          jest.clearAllMocks();
      
          // Default mock implementations
          mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
          mockGetUserProfile.mockResolvedValue(mockUserProfile);
          mockCreateUserProfile.mockResolvedValue(mockUserProfile);
          mockUpdateUserProfile.mockResolvedValue(mockUserProfile);
          mockDeleteUserProfile.mockResolvedValue(undefined); // Resolves void on success
        });
      
        // --- getUserProfileAction ---
        describe('getUserProfileAction', () => {
          it('should get the user profile for the currently logged-in user', async () => {
            const profile = await getUserProfileAction(mockUserId);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(profile).toEqual(mockUserProfile);
            expect(logger.warn).not.toHaveBeenCalled();
          });
      
          it('should throw Unauthorized error when trying to get another user profile', async () => {
            await expect(getUserProfileAction(otherUserId)).rejects.toThrow(mockUnauthorizedError.message);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(
              `Unauthorized attempt to get profile. Logged in user: ${mockUserId}, Requested user: ${otherUserId}`
            );
            expect(mockGetUserProfile).not.toHaveBeenCalled();
          });
      
          it('should throw Authentication error if session fetch fails', async () => {
            mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });
      
            await expect(getUserProfileAction(mockUserId)).rejects.toThrow(mockAuthError.message);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockGetUserProfile).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              'Error in getUserProfileAction:',
              expect.objectContaining({ error: mockAuthError.message })
            );
          });
      
           it('should throw Authentication error if session is null', async () => {
            mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      
            await expect(getUserProfileAction(mockUserId)).rejects.toThrow(mockAuthError.message);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockGetUserProfile).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              'Error in getUserProfileAction:',
              expect.objectContaining({ error: mockAuthError.message })
            );
          });
      
          it('should return null if user profile is not found in repository', async () => {
            mockGetUserProfile.mockResolvedValueOnce(null);
      
            const profile = await getUserProfileAction(mockUserId);
      
            expect(profile).toBeNull();
            expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(logger.error).not.toHaveBeenCalled(); // Service/Repo handles not found, action returns null
          });
      
          it('should return null and log error for general repository errors', async () => {
            const repoError = new Error('Database connection failed');
            mockGetUserProfile.mockRejectedValueOnce(repoError);
      
            const profile = await getUserProfileAction(mockUserId);
      
            expect(profile).toBeNull();
            expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(logger.error).toHaveBeenCalledWith(
              'Error in getUserProfileAction:',
              expect.objectContaining({ error: repoError.message })
            );
          });
        });
      
        // --- createUserProfileAction ---
        describe('createUserProfileAction', () => {
          const newProfileData: Partial<UserProfileModel> = {
            userId: mockUserId,
            email: 'new@example.com',
            onboardingCompleted: false,
          };
      
          it('should create a user profile successfully', async () => {
            const createdProfile = { ...mockUserProfile, ...newProfileData, id: mockUserId };
            mockCreateUserProfile.mockResolvedValueOnce(createdProfile);
      
            const profile = await createUserProfileAction(newProfileData);
      
            expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
            expect(profile).toEqual(createdProfile);
            expect(logger.error).not.toHaveBeenCalled();
          });
      
          it('should throw and log error if repository creation fails', async () => {
            const repoError = new Error('Failed to insert user');
            mockCreateUserProfile.mockRejectedValueOnce(repoError);
      
            await expect(createUserProfileAction(newProfileData)).rejects.toThrow(repoError);
      
            expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
            expect(logger.error).toHaveBeenCalledWith(
              'Error in createUserProfileAction:',
              repoError
            );
          });
        });
      
        // --- updateUserProfileAction ---
        describe('updateUserProfileAction', () => {
          const updateData: Partial<UserProfileModel> = {
            name: 'Updated Name',
            learningPurpose: 'business',
          };
          const updatedProfile = { ...mockUserProfile, ...updateData };
      
          it('should update the user profile for the currently logged-in user', async () => {
            mockUpdateUserProfile.mockResolvedValueOnce(updatedProfile);
      
            const profile = await updateUserProfileAction(mockUserId, updateData);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
            expect(profile).toEqual(updatedProfile);
            expect(logger.warn).not.toHaveBeenCalled();
          });
      
          it('should throw Unauthorized error when trying to update another user profile', async () => {
            await expect(updateUserProfileAction(otherUserId, updateData)).rejects.toThrow(mockUnauthorizedError.message);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(
              `Unauthorized attempt to update profile. Logged in user: ${mockUserId}, Target user: ${otherUserId}`
            );
            expect(mockUpdateUserProfile).not.toHaveBeenCalled();
          });
      
          it('should throw Authentication error if session fetch fails', async () => {
            mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });
      
            await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(mockAuthError.message);
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockUpdateUserProfile).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              'Error in updateUserProfileAction:',
              expect.objectContaining({ error: mockAuthError.message })
            );
          });
      
          it('should throw and log error if repository update fails', async () => {
            const repoError = new Error('Database update failed');
            mockUpdateUserProfile.mockRejectedValueOnce(repoError);
      
            await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(repoError);
      
            expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
            expect(logger.error).toHaveBeenCalledWith(
              'Error in updateUserProfileAction:',
              expect.objectContaining({ error: repoError.message })
            );
          });
        });
      
        // --- deleteUserProfileAction ---
        describe('deleteUserProfileAction', () => {
          it('should delete the user profile for the currently logged-in user', async () => {
            const result = await deleteUserProfileAction();
      
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(revalidatePath).toHaveBeenCalledWith('/');
            expect(revalidatePath).toHaveBeenCalledWith('/app');
            expect(result).toEqual({ success: true });
            expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Initiating profile deletion for user: ${mockUserId}`);
            expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Successfully completed profile deletion for user: ${mockUserId}`);
            expect(logger.error).not.toHaveBeenCalled();
          });
      
          it('should return error if session fetch fails', async () => {
            mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });
      
            const result = await deleteUserProfileAction();
      
            expect(result).toEqual({ success: false, error: mockAuthError.message });
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockDeleteUserProfile).not.toHaveBeenCalled();
            expect(revalidatePath).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              `Error in deleteUserProfileAction for user UNKNOWN:`, // User ID is unknown before session check
              expect.objectContaining({ message: mockAuthError.message })
            );
          });
      
           it('should return error if session is null', async () => {
            mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      
            const result = await deleteUserProfileAction();
      
            expect(result).toEqual({ success: false, error: mockAuthError.message }); // Should still be Authentication required
            expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
            expect(mockGetSession).toHaveBeenCalledTimes(1);
            expect(mockDeleteUserProfile).not.toHaveBeenCalled();
            expect(revalidatePath).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              `Error in deleteUserProfileAction for user UNKNOWN:`,
              expect.objectContaining({ message: mockAuthError.message })
            );
          });
      
      
          it('should return error and log if repository deletion fails', async () => {
            mockDeleteUserProfile.mockRejectedValueOnce(mockDeleteError);
      
            const result = await deleteUserProfileAction();
      
            expect(result).toEqual({ success: false, error: 'Failed to delete profile due to an unexpected error.' });
            expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(revalidatePath).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(
              `Error in deleteUserProfileAction for user ${mockUserId}:`,
              expect.objectContaining({ message: mockDeleteError.message })
            );
          });
      
           it('should return specific error message for Unauthorized error during deletion', async () => {
            const unauthorizedRepoError = new Error('Unauthorized');
            mockDeleteUserProfile.mockRejectedValueOnce(unauthorizedRepoError);
      
            const result = await deleteUserProfileAction();
      
            expect(result).toEqual({ success: false, error: 'Unauthorized to perform this action.' });
            expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
            expect(logger.error).toHaveBeenCalledWith(
              `Error in deleteUserProfileAction for user ${mockUserId}:`,
              expect.objectContaining({ message: unauthorizedRepoError.message })
            );
          });
        });
      });;

      const profile = await getUserProfileAction(mockUserId);

      expect(profile).toBeNull();
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getUserProfileAction:',
        expect.objectContaining({ error: repoError.message })
      );
    });
  });

  // --- createUserProfileAction ---
  describe('createUserProfileAction', () => {
    const newProfileData: Partial<UserProfileModel> = {
      userId: mockUserId,
      email: 'new@example.com',
      onboardingCompleted: false,
    };

    it('should create a user profile successfully', async () => {
      const createdProfile = { ...mockUserProfile, ...newProfileData, id: mockUserId };
      mockCreateUserProfile.mockResolvedValueOnce(createdProfile);

      const profile = await createUserProfileAction(newProfileData);

      expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
      expect(profile).toEqual(createdProfile);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw and log error if repository creation fails', async () => {
      const repoError = new Error('Failed to insert user');
      mockCreateUserProfile.mockRejectedValueOnce(repoError);

      await expect(createUserProfileAction(newProfileData)).rejects.toThrow(repoError);

      expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in createUserProfileAction:',
        repoError
      );
    });
  });

  // --- updateUserProfileAction ---
  describe('updateUserProfileAction', () => {
    const updateData: Partial<UserProfileModel> = {
      name: 'Updated Name',
      learningPurpose: 'business',
    };
    const updatedProfile = { ...mockUserProfile, ...updateData };

    it('should update the user profile for the currently logged-in user', async () => {
      mockUpdateUserProfile.mockResolvedValueOnce(updatedProfile);

      const profile = await updateUserProfileAction(mockUserId, updateData);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
      expect(profile).toEqual(updatedProfile);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should throw Unauthorized error when trying to update another user profile', async () => {
      await expect(updateUserProfileAction(otherUserId, updateData)).rejects.toThrow(mockUnauthorizedError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Unauthorized attempt to update profile. Logged in user: ${mockUserId}, Target user: ${otherUserId}`
      );
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it('should throw Authentication error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });

      await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(mockAuthError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateUserProfileAction:',
        expect.objectContaining({ error: mockAuthError.message })
      );
    });

    it('should throw and log error if repository update fails', async () => {
      const repoError = new Error('Database update failed');
      mockUpdateUserProfile.mockRejectedValueOnce(repoError);

      await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(repoError);

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateUserProfileAction:',
        expect.objectContaining({ error: repoError.message })
      );
    });
  });

  // --- deleteUserProfileAction ---
  describe('deleteUserProfileAction', () => {
    it('should delete the user profile for the currently logged-in user', async () => {
      const result = await deleteUserProfileAction();

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledWith('/app');
      expect(result).toEqual({ success: true });
      expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Initiating profile deletion for user: ${mockUserId}`);
      expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Successfully completed profile deletion for user: ${mockUserId}`);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: mockAuthError });

      const result = await deleteUserProfileAction();

      expect(result).toEqual({ success: false, error: mockAuthError.message });
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockDeleteUserProfile).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user UNKNOWN:`, // User ID is unknown before session check
        expect.objectContaining({ message: mockAuthError.message })
      );
    });

     it('should return error if session is null', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const result = await deleteUserProfileAction();

      expect(result).toEqual({ success: false, error: mockAuthError.message }); // Should still be Authentication required
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockDeleteUserProfile).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user UNKNOWN:`,
        expect.objectContaining({ message: mockAuthError.message })
      );
    });


    it('should return error and log if repository deletion fails', async () => {
      mockDeleteUserProfile.mockRejectedValueOnce(mockDeleteError);

      const result = await deleteUserProfileAction();

      expect(result).toEqual({ success: false, error: 'Failed to delete profile due to an unexpected error.' });
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user ${mockUserId}:`,
        expect.objectContaining({ message: mockDeleteError.message })
      );
    });

     it('should return specific error message for Unauthorized error during deletion', async () => {
      const unauthorizedRepoError = new Error('Unauthorized');
      mockDeleteUserProfile.mockRejectedValueOnce(unauthorizedRepoError);

      const result = await deleteUserProfileAction();

      expect(result).toEqual({ success: false, error: 'Unauthorized to perform this action.' });
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user ${mockUserId}:`,
        expect.objectContaining({ message: unauthorizedRepoError.message })
      );
    });
  });
});