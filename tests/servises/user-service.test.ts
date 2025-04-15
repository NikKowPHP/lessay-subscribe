// File: /tests/lib/server-actions/user-actions.test.ts

import {
  getUserProfileAction,
  createUserProfileAction,
  updateUserProfileAction,
  deleteUserProfileAction,
} from '@/lib/server-actions/user-actions';
import UserService from '@/services/user.service';
// No longer need to mock UserRepository directly here if we mock UserService
// import { UserRepository } from '@/repositories/user.repository';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { SubscriptionStatus } from '@prisma/client';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';

// --- Mocks ---

// Mock UserService and its prototype methods
jest.mock('@/services/user.service');
const mockGetUserProfile = jest.fn();
const mockCreateUserProfile = jest.fn();
const mockUpdateUserProfile = jest.fn();
const mockDeleteUserProfile = jest.fn();
UserService.prototype.getUserProfile = mockGetUserProfile;
UserService.prototype.createUserProfile = mockCreateUserProfile;
UserService.prototype.updateUserProfile = mockUpdateUserProfile;
UserService.prototype.deleteUserProfile = mockDeleteUserProfile;

// Mock Supabase Server Client and Auth methods
jest.mock('@/utils/supabase/server');
const mockGetSession = jest.fn();
// const mockAuthAdminDeleteUser = jest.fn(); // Keep if needed by service/repo mock, but likely not needed here
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    // admin: { // Mock admin interface if used by repository
    //   deleteUser: mockAuthAdminDeleteUser,
    // }
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

// Use specific error messages matching the implementation
const mockAuthError = new Error('Authentication required.');
const mockUnauthorizedError = new Error('Unauthorized');
const mockNotFoundError = new Error('User profile not found');
const mockDeleteError = new Error('Failed to delete profile');
const mockDeleteAuthRequiredErrorMsg = 'Authentication required. Please log in again.';
const mockDeleteUnauthorizedErrorMsg = 'Unauthorized to perform this action.';
const mockDeleteGenericErrorMsg = 'Failed to delete profile due to an unexpected error.';


// --- Test Suite ---
describe('User Server Actions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementations for UserService methods
    mockGetUserProfile.mockResolvedValue(mockUserProfile);
    mockCreateUserProfile.mockResolvedValue(mockUserProfile);
    mockUpdateUserProfile.mockResolvedValue(mockUserProfile);
    mockDeleteUserProfile.mockResolvedValue(undefined); // Resolves void on success

    // Default mock implementation for Supabase getSession
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
  });

  // --- getUserProfileAction ---
  describe('getUserProfileAction', () => {
    it('should get the user profile for the currently logged-in user', async () => {
      const profile = await getUserProfileAction(mockUserId);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      // Check that the mocked service method was called
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
      // Service method should not be called if authorization fails
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });

    it('should throw Authentication error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Supabase connection error') }); // Simulate Supabase error

      await expect(getUserProfileAction(mockUserId)).rejects.toThrow(mockAuthError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserProfile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getUserProfileAction:',
        expect.objectContaining({ error: mockAuthError.message }) // Check the error thrown by the action
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

    it('should return null if user profile is not found by the service', async () => {
      // Configure the mocked service method to return null
      mockGetUserProfile.mockResolvedValueOnce(null);

      const profile = await getUserProfileAction(mockUserId);

      expect(profile).toBeNull(); // Action should return null now
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).not.toHaveBeenCalled(); // Action handles null return gracefully
    });

    it('should return null and log error for general service errors', async () => {
      const serviceError = new Error('Database connection failed');
      // Configure the mocked service method to reject
      mockGetUserProfile.mockRejectedValueOnce(serviceError);

      const profile = await getUserProfileAction(mockUserId);

      expect(profile).toBeNull(); // Action should catch, log, and return null
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in getUserProfileAction:',
        expect.objectContaining({ error: serviceError.message })
      );
    });
  });

  // --- createUserProfileAction ---
  describe('createUserProfileAction', () => {
    const newProfileData: Partial<UserProfileModel> = {
      userId: mockUserId, // Important: Usually userId comes from auth, ensure it's passed
      email: 'new@example.com',
      onboardingCompleted: false,
    };

    it('should create a user profile successfully', async () => {
      const createdProfile = { ...mockUserProfile, ...newProfileData, id: mockUserId };
      mockCreateUserProfile.mockResolvedValueOnce(createdProfile);

      const profile = await createUserProfileAction(newProfileData);

      // Check that the mocked service method was called
      expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
      expect(profile).toEqual(createdProfile);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw and log error if service creation fails', async () => {
      const serviceError = new Error('Failed to insert user');
      mockCreateUserProfile.mockRejectedValueOnce(serviceError);

      // Action should re-throw the error
      await expect(createUserProfileAction(newProfileData)).rejects.toThrow(serviceError);

      expect(mockCreateUserProfile).toHaveBeenCalledWith(newProfileData);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in createUserProfileAction:',
        serviceError
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
      // Check that the mocked service method was called
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
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Supabase error') });

      await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(mockAuthError.message);

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateUserProfileAction:',
        expect.objectContaining({ error: mockAuthError.message })
      );
    });

    it('should throw and log error if service update fails', async () => {
      const serviceError = new Error('Database update failed');
      mockUpdateUserProfile.mockRejectedValueOnce(serviceError);

      // Action should re-throw the error
      await expect(updateUserProfileAction(mockUserId, updateData)).rejects.toThrow(serviceError);

      expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserId, updateData);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in updateUserProfileAction:',
        expect.objectContaining({ error: serviceError.message })
      );
    });
  });

  // --- deleteUserProfileAction ---
  describe('deleteUserProfileAction', () => {
    it('should delete the user profile for the currently logged-in user', async () => {
      const result = await deleteUserProfileAction();

      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      // Check that the mocked service method was called
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidatePath).toHaveBeenCalledWith('/app');
      expect(result).toEqual({ success: true });
      expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Initiating profile deletion for user: ${mockUserId}`);
      expect(logger.warn).toHaveBeenCalledWith(`deleteUserProfileAction: Successfully completed profile deletion for user: ${mockUserId}`);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Supabase error') });

      const result = await deleteUserProfileAction();

      // Check the specific error message from the action's catch block
      expect(result).toEqual({ success: false, error: mockDeleteAuthRequiredErrorMsg });
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockDeleteUserProfile).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user UNKNOWN:`, // User ID is unknown before session check
        expect.objectContaining({ message: mockAuthError.message }) // The original error causing the failure
      );
    });

     it('should return error if session is null', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      const result = await deleteUserProfileAction();

      // Check the specific error message
      expect(result).toEqual({ success: false, error: mockDeleteAuthRequiredErrorMsg });
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockDeleteUserProfile).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user UNKNOWN:`,
        expect.objectContaining({ message: mockAuthError.message }) // The original error
      );
    });


    it('should return error and log if service deletion fails', async () => {
      mockDeleteUserProfile.mockRejectedValueOnce(mockDeleteError);

      const result = await deleteUserProfileAction();

      // Check the specific error message
      expect(result).toEqual({ success: false, error: mockDeleteGenericErrorMsg });
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user ${mockUserId}:`,
        expect.objectContaining({ message: mockDeleteError.message })
      );
    });

     it('should return specific error message for Unauthorized error during deletion', async () => {
      const unauthorizedServiceError = new Error('Unauthorized'); // Simulate service throwing this
      mockDeleteUserProfile.mockRejectedValueOnce(unauthorizedServiceError);

      const result = await deleteUserProfileAction();

      // Check the specific error message
      expect(result).toEqual({ success: false, error: mockDeleteUnauthorizedErrorMsg });
      expect(mockDeleteUserProfile).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).toHaveBeenCalledWith(
        `Error in deleteUserProfileAction for user ${mockUserId}:`,
        expect.objectContaining({ message: unauthorizedServiceError.message })
      );
    });
  });
});