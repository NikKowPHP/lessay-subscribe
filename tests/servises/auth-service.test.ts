// File: /tests/lib/server-actions/auth-actions.test.ts

import {
  loginAction,
  registerAction,
  loginWithGoogleAction,
  logoutAction,
  getSessionAction,
} from '@/lib/server-actions/auth-actions';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';
import { Session, User, AuthError } from '@supabase/supabase-js';

// --- Mocks ---
jest.mock('@/utils/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

// Mock environment variables
const mockSiteUrl = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SITE_URL = mockSiteUrl;

// --- Test Suite ---
describe('Auth Server Actions', () => {
  let mockSupabaseClient: any;
  let mockAuth: any;

  const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
  const mockSession = {
    access_token: 'abc',
    refresh_token: 'def',
    user: mockUser,
    expires_in: 3600,
    token_type: 'bearer',
  } as Session;

  // Use plain objects for mock errors to avoid instanceof issues with mocked classes
  const mockAuthError = {
    name: 'AuthApiError', // Supabase errors often have this name
    message: 'Invalid credentials',
    status: 400,
  } as AuthError; // Cast for type checking

  const registerError = {
    name: 'AuthApiError',
    message: 'User already registered',
    status: 400,
  } as AuthError;

  const googleError = {
    name: 'AuthApiError',
    message: 'OAuth provider error',
    status: 500,
  } as AuthError;

  const logoutError = {
    name: 'AuthApiError',
    message: 'Logout failed',
    status: 500,
  } as AuthError;

  const sessionError = {
    name: 'AuthApiError',
    message: 'Failed to get session',
    status: 500,
  } as AuthError;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup the mock Supabase client and its auth methods
    mockAuth = {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    };
    mockSupabaseClient = {
      auth: mockAuth,
    };

    // Configure the mock factory to return our mock client
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  // --- loginAction ---
  describe('loginAction', () => {
    it('should call createSupabaseServerClient and supabase.auth.signInWithPassword', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      await loginAction('test@example.com', 'password123');
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return user and session data on successful login', async () => {
      const expectedData = { user: mockUser, session: mockSession };
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: expectedData,
        error: null,
      });
      const result = await loginAction('test@example.com', 'password123');
      expect(result).toEqual({ data: expectedData, error: null });
    });

    it('should return error and log it if supabase login fails', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });
      const result = await loginAction('test@example.com', 'password123');
      expect(result).toEqual({ data: { user: null, session: null }, error: mockAuthError });
      expect(logger.error).toHaveBeenCalledWith('Login error:', mockAuthError);
    });
  });

  // --- registerAction ---
  describe('registerAction', () => {
    it('should call createSupabaseServerClient and supabase.auth.signUp', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      await registerAction('new@example.com', 'newpassword');
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword',
      });
    });

    it('should return user and session data on successful registration', async () => {
      const expectedData = { user: mockUser, session: mockSession };
      mockAuth.signUp.mockResolvedValueOnce({
        data: expectedData,
        error: null,
      });
      const result = await registerAction('new@example.com', 'newpassword');
      expect(result).toEqual({ data: expectedData, error: null });
    });

    it('should return error and log it if supabase registration fails', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: registerError,
      });
      const result = await registerAction('new@example.com', 'newpassword');
      expect(result).toEqual({ data: { user: null, session: null }, error: registerError });
      expect(logger.error).toHaveBeenCalledWith('Registration error:', registerError);
    });
  });

  // --- loginWithGoogleAction ---
  describe('loginWithGoogleAction', () => {
    it('should call createSupabaseServerClient and supabase.auth.signInWithOAuth', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });
      await loginWithGoogleAction();
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${mockSiteUrl}/app/lessons`,
        },
      });
    });

    it('should return { error: null } on successful initiation', async () => {
       mockAuth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });
       const result = await loginWithGoogleAction();
       expect(result).toEqual({ error: null });
    });


    it('should return error and log it if supabase Google login fails', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: googleError });
      const result = await loginWithGoogleAction();
      expect(result).toEqual({ error: googleError });
      expect(logger.error).toHaveBeenCalledWith('Google login error:', googleError);
    });
  });

  // --- logoutAction ---
  describe('logoutAction', () => {
    it('should call createSupabaseServerClient and supabase.auth.signOut', async () => {
      mockAuth.signOut.mockResolvedValueOnce({ error: null });
      await logoutAction();
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

     it('should return { error: null } on successful logout', async () => {
       mockAuth.signOut.mockResolvedValueOnce({ error: null });
       const result = await logoutAction();
       expect(result).toEqual({ error: null });
    });

    it('should return error and log it if supabase logout fails', async () => {
      mockAuth.signOut.mockResolvedValueOnce({ error: logoutError });
      const result = await logoutAction();
      expect(result).toEqual({ error: logoutError });
      expect(logger.error).toHaveBeenCalledWith('Logout error:', logoutError);
    });
  });

  // --- getSessionAction ---
  describe('getSessionAction', () => {
    it('should call createSupabaseServerClient and supabase.auth.getSession', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      await getSessionAction();
      expect(createSupabaseServerClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should return the session on success', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      const result = await getSessionAction();
      expect(result).toEqual(mockSession);
    });

    it('should return null if no session exists', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });
      const result = await getSessionAction();
      expect(result).toBeNull();
    });

    it('should return null and log error if supabase getSession fails', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: sessionError,
      });
      const result = await getSessionAction();
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Get session error:', sessionError);
    });
  });
});