// File: /tests/repositories/user.repository.test.ts

import { UserRepository, IUserRepository } from '@/repositories/user.repository';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';
import { UserProfileModel } from '@/models/AppAllModels.model';
import { SubscriptionStatus, User as PrismaUser, Onboarding as PrismaOnboarding } from '@prisma/client';
import { SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';

// --- Mocks ---

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // Mock other models if needed by relations, though not strictly necessary for these tests
}));

// TODO: fix tests
// Mock Supabase Server Client
jest.mock('@/utils/supabase/server');
const mockGetSession = jest.fn();
const mockAuthAdminDeleteUser = jest.fn();
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    admin: {
      deleteUser: mockAuthAdminDeleteUser,
    },
  },
} as unknown as SupabaseClient;
(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Mock Logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
}));

// --- Test Data ---
const mockUserId = 'auth-user-id-123';
const otherUserId = 'other-user-id-456';

const mockSupabaseUser: SupabaseUser = {
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
  user: mockSupabaseUser,
  expires_in: 3600,
  token_type: 'bearer',
};

const mockPrismaOnboarding: PrismaOnboarding = {
    id: 'onboarding-id-1',
    userId: mockUserId,
    steps: {},
    completed: true,
    nativeLanguage: 'English',
    targetLanguage: 'German',
    proficiencyLevel: 'beginner',
    learningPurpose: 'general',
    initialAssessmentCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockPrismaUser: PrismaUser & { onboarding: PrismaOnboarding | null } = {
  id: mockUserId,
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
  subscriptionStatus: SubscriptionStatus.ACTIVE,
  subscriptionEndDate: new Date(Date.now() + 86400000), // Tomorrow
  onboarding: mockPrismaOnboarding,
};

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
  subscriptionEndDate: mockPrismaUser.subscriptionEndDate,
  createdAt: mockPrismaUser.createdAt,
  updatedAt: mockPrismaUser.updatedAt,
};

const mockUnauthorizedError = new Error('Unauthorized');
const mockUnauthorizedProfileError = new Error('Unauthorized to access this profile');
const mockUnauthorizedUpdateError = new Error('Unauthorized to update this profile');
const mockUnauthorizedCreateError = new Error('Unauthorized to create this profile');
const mockUnauthorizedDeleteError = new Error('Unauthorized: You can only delete your own profile.');
const mockNotFoundError = new Error('User profile not found'); // Or similar Prisma error
const mockMissingFieldsError = new Error('Missing required fields: userId and email are required');

// --- Test Suite ---
describe('UserRepository', () => {
  let userRepository: IUserRepository;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockPrismaUser);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockPrismaUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(mockPrismaUser);
    (prisma.user.delete as jest.Mock).mockResolvedValue(mockPrismaUser); // delete returns the deleted record
    mockAuthAdminDeleteUser.mockResolvedValue({ data: {}, error: null });

    // Instantiate the repository
    // Need to bypass constructor logic slightly as it checks typeof window
    userRepository = new UserRepository();
    // Manually assign the getSupabaseClient method for server-side simulation
    (userRepository as any).getSupabaseClient = async () => mockSupabaseClient;
  });

  // --- getSession (Internal Helper) ---
  describe('getSession (internal)', () => {
    it('should return session if Supabase client provides it', async () => {
      const session = await (userRepository as any).getSession();
      expect(session).toEqual(mockSession);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it('should throw Unauthorized error if Supabase returns an error', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Connection failed') });
      await expect((userRepository as any).getSession()).rejects.toThrow(mockUnauthorizedError);
    });

    it('should throw Unauthorized error if Supabase returns null session', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      await expect((userRepository as any).getSession()).rejects.toThrow(mockUnauthorizedError);
    });

     it('should throw Unauthorized error if Supabase returns session without user', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: { ...mockSession, user: null } }, error: null });
      await expect((userRepository as any).getSession()).rejects.toThrow(mockUnauthorizedError);
    });
  });

  // --- getUserProfile ---
  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const profile = await userRepository.getUserProfile(mockUserId);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: { onboarding: true },
      });
      expect(profile).toEqual(mockUserProfile);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw error if trying to get profile for a different user', async () => {
      await expect(userRepository.getUserProfile(otherUserId)).rejects.toThrow(mockUnauthorizedProfileError);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error fetching user profile:', mockUnauthorizedProfileError);
    });

    it('should return null if user is not found in prisma', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const profile = await userRepository.getUserProfile(mockUserId);
      expect(profile).toBeNull();
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: { onboarding: true },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should re-throw error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Session fetch error') });
      await expect(userRepository.getUserProfile(mockUserId)).rejects.toThrow(mockUnauthorizedError);
      expect(logger.error).toHaveBeenCalledWith('Error fetching user profile:', mockUnauthorizedError);
    });

    it('should re-throw error if prisma query fails', async () => {
      const dbError = new Error('Database connection error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValueOnce(dbError);
      await expect(userRepository.getUserProfile(mockUserId)).rejects.toThrow(dbError);
      expect(logger.error).toHaveBeenCalledWith('Error fetching user profile:', dbError);
    });
  });

  // --- createUserProfile ---
  describe('createUserProfile', () => {
    const createData: Partial<UserProfileModel> = {
      userId: mockUserId,
      email: 'new@example.com',
    };
    const expectedPrismaCreateData = {
        id: mockUserId,
        email: 'new@example.com',
        subscriptionStatus: SubscriptionStatus.NONE,
        subscriptionEndDate: null,
        onboarding: {
          create: {
            steps: {},
            completed: false,
          },
        },
    };
    const expectedReturnProfile: UserProfileModel = {
        id: mockUserId,
        userId: mockUserId,
        email: 'new@example.com',
        onboardingCompleted: false,
        initialAssessmentCompleted: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        subscriptionStatus: SubscriptionStatus.NONE,
        subscriptionEndDate: null,
    };


    it('should create a user profile successfully if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // User doesn't exist
      const createdPrismaUser = {
          ...mockPrismaUser,
          email: createData.email,
          onboarding: { ...mockPrismaOnboarding, completed: false, initialAssessmentCompleted: false },
          subscriptionStatus: SubscriptionStatus.NONE,
          subscriptionEndDate: null,
      };
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(createdPrismaUser);

      const profile = await userRepository.createUserProfile(createData);

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expectedPrismaCreateData,
        include: { onboarding: true },
      });
      expect(profile).toMatchObject(expectedReturnProfile); // Use partial match for dates
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return existing profile if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockPrismaUser); // User exists
      // Mock findUnique again for the getUserProfile call within createUserProfile
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockPrismaUser);

      const profile = await userRepository.createUserProfile(createData);

      expect(mockGetSession).toHaveBeenCalledTimes(1); // Called once for the initial check
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2); // Called for exists check, then for getProfile
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(profile).toEqual(mockUserProfile); // Should return the full existing profile
    });

    it('should throw error if trying to create profile for a different user ID', async () => {
       const createDataOtherUser: Partial<UserProfileModel> = {
          userId: otherUserId, // Different user ID
          email: 'other@example.com',
       };
      await expect(userRepository.createUserProfile(createDataOtherUser)).rejects.toThrow(mockUnauthorizedCreateError);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error creating user profile:', mockUnauthorizedCreateError);
    });

    it('should throw error if required fields (userId, email) are missing', async () => {
      await expect(userRepository.createUserProfile({ userId: mockUserId })).rejects.toThrow(mockMissingFieldsError);
      await expect(userRepository.createUserProfile({ email: 'test@test.com' })).rejects.toThrow(mockMissingFieldsError);
      expect(mockGetSession).toHaveBeenCalledTimes(2); // Called for each attempt
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should re-throw error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Session fetch error') });
      await expect(userRepository.createUserProfile(createData)).rejects.toThrow(mockUnauthorizedError);
      expect(logger.error).toHaveBeenCalledWith('Error creating user profile:', mockUnauthorizedError);
    });

    it('should re-throw error if prisma query fails', async () => {
      const dbError = new Error('Database connection error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValueOnce(dbError); // Fail the exists check
      await expect(userRepository.createUserProfile(createData)).rejects.toThrow(dbError);
      expect(logger.error).toHaveBeenCalledWith('Error creating user profile:', dbError);
    });
  });

  // --- updateUserProfile ---
  describe('updateUserProfile', () => {
    const updateData: Partial<UserProfileModel> = {
      name: 'Updated Name',
      nativeLanguage: 'Spanish',
      onboardingCompleted: true,
    };
    const expectedPrismaUpdateData = {
        name: 'Updated Name',
        onboarding: {
          upsert: {
            create: {
              nativeLanguage: 'Spanish',
              completed: true,
              steps: {},
            },
            update: {
              nativeLanguage: 'Spanish',
              completed: true,
            },
          },
        },
    };
    const updatedPrismaUser = {
        ...mockPrismaUser,
        name: 'Updated Name',
        onboarding: { ...mockPrismaOnboarding, nativeLanguage: 'Spanish', completed: true }
    };
    const expectedReturnProfile: UserProfileModel = {
        ...mockUserProfile,
        name: 'Updated Name',
        nativeLanguage: 'Spanish',
        onboardingCompleted: true,
    };

    it('should update user profile successfully', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedPrismaUser);
      const profile = await userRepository.updateUserProfile(mockUserId, updateData);

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expectedPrismaUpdateData,
        include: { onboarding: true },
      });
      expect(profile).toMatchObject(expectedReturnProfile);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should throw error if trying to update profile for a different user', async () => {
      await expect(userRepository.updateUserProfile(otherUserId, updateData)).rejects.toThrow(mockUnauthorizedUpdateError);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error updating user profile:', mockUnauthorizedUpdateError);
    });

    it('should re-throw error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Session fetch error') });
      await expect(userRepository.updateUserProfile(mockUserId, updateData)).rejects.toThrow(mockUnauthorizedError);
      expect(logger.error).toHaveBeenCalledWith('Error updating user profile:', mockUnauthorizedError);
    });

    it('should re-throw error if prisma query fails', async () => {
      const dbError = new Error('Database connection error');
      (prisma.user.update as jest.Mock).mockRejectedValueOnce(dbError);
      await expect(userRepository.updateUserProfile(mockUserId, updateData)).rejects.toThrow(dbError);
      expect(logger.error).toHaveBeenCalledWith('Error updating user profile:', dbError);
    });
  });

  // --- deleteUserProfile ---
  describe('deleteUserProfile', () => {
    it('should delete user profile and auth user successfully', async () => {
      await userRepository.deleteUserProfile(mockUserId);

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(mockAuthAdminDeleteUser).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(`Starting deletion for user: ${mockUserId}`);
      expect(logger.info).toHaveBeenCalledWith(`Deleting user data from DB: ${mockUserId}`);
      expect(logger.info).toHaveBeenCalledWith(`DB deletion complete: ${mockUserId}`);
      expect(logger.info).toHaveBeenCalledWith(`Auth user deleted: ${mockUserId}`);
      expect(logger.warn).toHaveBeenCalledWith(`Deletion completed for: ${mockUserId}`);
    });

    it('should throw error if trying to delete profile for a different user', async () => {
      await expect(userRepository.deleteUserProfile(otherUserId)).rejects.toThrow(mockUnauthorizedDeleteError);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).not.toHaveBeenCalled();
      expect(mockAuthAdminDeleteUser).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(`Unauthorized delete attempt. Session user: ${mockUserId}, Target: ${otherUserId}`);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.objectContaining({ message: mockUnauthorizedDeleteError.message }));
    });

    it('should re-throw error if session fetch fails', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('Session fetch error') });
      await expect(userRepository.deleteUserProfile(mockUserId)).rejects.toThrow(mockUnauthorizedError);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.objectContaining({ message: mockUnauthorizedError.message }));
    });

    it('should handle Prisma P2025 error (Record not found) gracefully', async () => {
      const p2025Error = { code: 'P2025', message: 'Record to delete not found.' };
      (prisma.user.delete as jest.Mock).mockRejectedValueOnce(p2025Error);

      // Should not throw, but log a warning and still attempt auth deletion
      await expect(userRepository.deleteUserProfile(mockUserId)).resolves.toBeUndefined();

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`User profile not found in DB for deletion (userId: ${mockUserId})`));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Attempting Auth Provider deletion for potentially orphaned user: ${mockUserId}`));
      expect(mockAuthAdminDeleteUser).toHaveBeenCalledWith(mockUserId); // Still attempts auth deletion
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.anything()); // Should not log the main error
    });

     it('should log error if auth deletion fails after P2025 error', async () => {
      const p2025Error = { code: 'P2025', message: 'Record to delete not found.' };
      const authDeleteError = new Error('Auth service unavailable');
      (prisma.user.delete as jest.Mock).mockRejectedValueOnce(p2025Error);
      mockAuthAdminDeleteUser.mockResolvedValueOnce({ data: null, error: authDeleteError }); // Simulate auth error

      await expect(userRepository.deleteUserProfile(mockUserId)).resolves.toBeUndefined(); // Still resolves void

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`User profile not found in DB for deletion (userId: ${mockUserId})`));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`Attempting Auth Provider deletion for potentially orphaned user: ${mockUserId}`));
      expect(mockAuthAdminDeleteUser).toHaveBeenCalledWith(mockUserId);
      // Should log the auth deletion error specifically
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Failed to delete potentially orphaned user ${mockUserId} from Auth Provider:`), authDeleteError.message);
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.anything()); // Should not log the main error
    });

    it('should re-throw other Prisma errors during deletion', async () => {
      const dbError = new Error('Database connection error');
      (prisma.user.delete as jest.Mock).mockRejectedValueOnce(dbError);
      await expect(userRepository.deleteUserProfile(mockUserId)).rejects.toThrow(`Failed to delete user profile: ${dbError.message}`);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.objectContaining({ message: dbError.message }));
      expect(mockAuthAdminDeleteUser).not.toHaveBeenCalled(); // Should fail before auth deletion
    });

    it('should throw error if auth user deletion fails', async () => {
      const authError = new Error('Failed to delete auth user');
      mockAuthAdminDeleteUser.mockResolvedValueOnce({ data: null, error: authError });

      await expect(userRepository.deleteUserProfile(mockUserId)).rejects.toThrow(authError.message); // Action re-throws the specific auth error message

      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(mockAuthAdminDeleteUser).toHaveBeenCalledWith(mockUserId);
      expect(logger.error).toHaveBeenCalledWith(`Auth deletion failed: ${authError.message}`, { userId: mockUserId });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error during user profile deletion'), expect.objectContaining({ message: authError.message }));
    });
  });
});