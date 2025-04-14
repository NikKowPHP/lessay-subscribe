// File: tests/services/supabase-auth.service.test.ts

import {
  SupabaseAuthService,
  supabase,
} from '@/services/auth.service';
import { createClient } from '@supabase/supabase-js';
import {
  AuthChangeEvent,
  Session,
  User,
  AuthError,
} from '@supabase/supabase-js';
import logger from '@/utils/logger';



// Use environment variables directly for client creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// --- Mocks ---
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    admin: {
      // Mock admin functions
      deleteUser: jest.fn(),
    },
  };
  const mockClient = {
    auth: mockAuth,
  };
  return {
    createClient: jest.fn(() => mockClient), // Mock the factory function
  };
});

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

// --- Test Suite ---
describe('SupabaseAuthService', () => {
  let authService: SupabaseAuthService;
  let mockSupabaseAuth: any; // Type assertion for easier mocking access
  let mockSupabaseAdminAuth: any;
  let mockSupabaseAdminAuthDeleteUser: jest.Mock; 

  const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
  const mockSession = {
    access_token: 'abc',
    refresh_token: 'def',
    user: mockUser,
  } as Session;

  const mockAdminAuth = {
    deleteUser: jest.fn(),
  };

  const mockRegularAuth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    // IMPORTANT: Include admin mock here for when createClient might be called for admin purposes
    admin: mockAdminAuth,
  };

  const mockSupabaseClient = {
    auth: mockRegularAuth,
  };

  // Use plain objects for mock errors
  const mockAuthError = {
    name: 'AuthError',
    message: 'Invalid credentials',
    status: 400,
  };
  const registerError = {
    name: 'AuthError',
    message: 'User already registered',
    status: 400,
  };
  const googleError = {
    name: 'AuthError',
    message: 'OAuth provider error',
    status: 500,
  };
  const logoutError = {
    name: 'AuthError',
    message: 'Logout failed',
    status: 500,
  };
  const sessionError = {
    name: 'AuthError',
    message: 'Failed to get session',
    status: 500,
  };
  const notFoundError = {
    message: 'User not found',
    status: 404,
    name: 'AuthApiError',
  };
  const deleteAdminError = {
    message: 'Database error',
    status: 500,
    name: 'AuthApiError',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Re-assign mocked Supabase auth object for easier access in tests
    // We mock createClient, so the 'supabase' export is also mocked
    mockSupabaseAuth = (supabase as any).auth;
    // We need to simulate the admin client creation for deleteUserById
    // Since createClient is mocked, we can access the admin mock through it
    // mockSupabaseAdminAuth = (
    //   createClient(
    //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //     process.env.SUPABASE_SERVICE_ROLE_KEY!,
    //     { auth: { autoRefreshToken: false, persistSession: false } }
    //   ) as any
    // ).auth.admin; // Get the mocked admin object

    authService = new SupabaseAuthService();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  // --- login ---
  describe('login', () => {
    it('should call supabase.auth.signInWithPassword with correct credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      await authService.login('test@example.com', 'password123');
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return user and session data on successful login', async () => {
      const expectedData = { user: mockUser, session: mockSession };
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: expectedData,
        error: null,
      });
      const result = await authService.login('test@example.com', 'password123');
      expect(result).toEqual(expectedData);
    });

    it('should throw an error if supabase login fails', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });
      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow(mockAuthError.message);
    });
  });

  // --- register ---
  describe('register', () => {
    it('should call supabase.auth.signUp with correct credentials', async () => {
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      await authService.register('new@example.com', 'newpassword');
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword',
      });
    });

    it('should return user and session data on successful registration', async () => {
      const expectedData = { user: mockUser, session: mockSession };
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: expectedData,
        error: null,
      });
      const result = await authService.register(
        'new@example.com',
        'newpassword'
      );
      expect(result).toEqual(expectedData);
    });

    it('should throw an error if supabase registration fails', async () => {
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: registerError,
      });
      await expect(
        authService.register('new@example.com', 'newpassword')
      ).rejects.toThrow(registerError.message);
    });
  });

  // --- loginWithGoogle ---
  describe('loginWithGoogle', () => {
    // Need to mock window.location.origin
    const originalLocation = window.location;
    beforeAll(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, origin: 'http://localhost:3000' }, // Mock origin
      });
    });
    afterAll(() => {
      Object.defineProperty(window, 'location', {
        // Restore original location
        configurable: true,
        value: originalLocation,
      });
    });

    it('should call supabase.auth.signInWithOAuth with google provider and redirect', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: {},
        error: null,
      }); // signInWithOAuth doesn't return user/session directly on success
      await authService.loginWithGoogle();
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `http://localhost:3000/app/lessons`, // Ensure this matches the mock origin + path
        },
      });
    });

    it('should throw an error if supabase Google login fails', async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: {},
        error: googleError,
      });
      await expect(authService.loginWithGoogle()).rejects.toThrow(
        googleError.message
      );
    });
  });

  // --- logout ---
  describe('logout', () => {
    it('should call supabase.auth.signOut', async () => {
      mockSupabaseAuth.signOut.mockResolvedValueOnce({ error: null });
      await authService.logout();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if supabase logout fails', async () => {
      mockSupabaseAuth.signOut.mockResolvedValueOnce({ error: logoutError });
      await expect(authService.logout()).rejects.toThrow(logoutError.message);
    });
  });

  // --- getSession ---
  describe('getSession', () => {
    it('should call supabase.auth.getSession', async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      await authService.getSession();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should return the session on success', async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      const result = await authService.getSession();
      expect(result).toEqual(mockSession);
    });

    it('should return null if no session exists', async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });
      const result = await authService.getSession();
      expect(result).toBeNull();
    });

    it('should throw an error if supabase getSession fails', async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: sessionError,
      });
      await expect(authService.getSession()).rejects.toThrow(
        sessionError.message
      );
    });
  });

  // --- onAuthStateChange ---
  describe('onAuthStateChange', () => {
    it('should call supabase.auth.onAuthStateChange with the callback', () => {
      const callback = jest.fn();
      authService.onAuthStateChange(callback);
      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalledWith(callback);
    });

    it('should return the subscription data', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      const subscriptionData = { data: { subscription: { unsubscribe } } };
      mockSupabaseAuth.onAuthStateChange.mockReturnValueOnce(subscriptionData); // Return the specific mock value
      const result = authService.onAuthStateChange(callback);
      expect(result).toEqual(subscriptionData);
      expect(result.data.subscription.unsubscribe).toBeDefined();
    });
  });

  // --- deleteUserById ---
  describe('deleteUserById', () => {
    const userIdToDelete = 'user-to-delete';
    const testAdminKey = 'test-admin-key';

    const originalWindow = global.window;

   // Helper to set up server environment for tests
   const setupServerEnv = (withKey = true) => {
    // @ts-ignore
    delete global.window; // Simulate server
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-url.com';
    if (withKey) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = testAdminKey;
    } else {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    // Re-initialize service AFTER setting env vars, so constructor uses them
    authService = new SupabaseAuthService();
};

    beforeEach(() => {
      // @ts-ignore
      delete global.window; // Simulate server environment for this test block
      // Set environment variable for admin key (needed for initialization check)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-admin-key';
      // Reset mock for admin client creation check
      (createClient as jest.Mock).mockClear();
      // Re-initialize service to pick up server environment
      authService = new SupabaseAuthService();
      // Ensure the admin client mock is correctly referenced after re-initialization
      mockSupabaseAdminAuth = (
        createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        ) as any
      ).auth.admin; // This correctly assigns the admin mock object
    });
    afterEach(() => {
      global.window = originalWindow; // Restore window object
      delete process.env.SUPABASE_SERVICE_ROLE_KEY; // Clean up env var
    });

    it('should return error if called on the client-side', async () => {
      global.window = originalWindow; // Temporarily restore window for this test
      authService = new SupabaseAuthService(); // Re-init in client env

      const result = await authService.deleteUserById(userIdToDelete);

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain(
        'User deletion can only be performed server-side'
      );
      expect(mockSupabaseAdminAuth.deleteUser).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Attempted to call deleteUserById from the client-side'
        )
      );
      global.window = undefined as any; // Set back for other tests in block
    });

    it('should return error if admin client is not initialized', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY; // Simulate missing key
      authService = new SupabaseAuthService(); // Re-init without key

      const result = await authService.deleteUserById(userIdToDelete);

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Admin client not available');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not be available.')
      );
      expect(mockSupabaseAdminAuth.deleteUser).not.toHaveBeenCalled();
    });

    it('should call supabaseAdmin.auth.admin.deleteUser with the correct userId', async () => {
      mockSupabaseAdminAuth.deleteUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      }); // Mock successful deletion
      await authService.deleteUserById(userIdToDelete);
      expect(mockSupabaseAdminAuth.deleteUser).toHaveBeenCalledWith(
        userIdToDelete
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Attempting Supabase Auth deletion for user ${userIdToDelete}`
        )
      );
    });

    it('should return { error: null } on successful deletion', async () => {
      mockSupabaseAdminAuth.deleteUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });
      const result = await authService.deleteUserById(userIdToDelete);
      expect(result.error).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Successfully deleted user ${userIdToDelete}`)
      );
    });

    it('should return { error: null } if user is not found (already deleted)', async () => {
      setupServerEnv(); // Setup server environment
      mockSupabaseAdminAuth.deleteUser.mockResolvedValueOnce({
        data: { user: null },
        error: notFoundError,
      });
      const result = await authService.deleteUserById(userIdToDelete);

      expect(result.error).toBeNull(); // Treat as success
      expect(mockSupabaseAdminAuth.deleteUser).toHaveBeenCalledWith(
        userIdToDelete
      ); // Verify call happened
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `User ${userIdToDelete} not found in Supabase Auth`
        )
      );
    });

    it('should return the error object if admin deletion fails', async () => {
      setupServerEnv(true); // Setup server environment
    // Mock the admin call to return a generic error
    mockSupabaseAdminAuth.deleteUser.mockResolvedValueOnce({
      data: { user: null },
      error: deleteAdminError,
    });
      const result = await authService.deleteUserById(userIdToDelete);

      expect(result.error).toEqual(deleteAdminError);
      expect(mockSupabaseAdminAuth.deleteUser).toHaveBeenCalledWith(userIdToDelete);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Supabase Auth Admin Error deleting user ${userIdToDelete}`
        ),
        deleteAdminError // Expect the error object itself to be logged
      );
    });

    it('should return the error object if an exception occurs during deletion', async () => {
      const exception = new Error('Unexpected exception');
      mockSupabaseAdminAuth.deleteUser.mockRejectedValueOnce(exception);
      const result = await authService.deleteUserById(userIdToDelete);
      expect(result.error).toEqual(exception);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Exception during Supabase Auth Admin deleteUser call for ${userIdToDelete}`
        ),
        exception
      );
    });
  });
});
