
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/context/auth-context';
import * as AuthActions from '@/lib/server-actions/auth-actions';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';

// --- Mocks ---

// Mock Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
(useRouter as jest.Mock).mockReturnValue({
  push: mockRouterPush,
  replace: mockRouterReplace,
  prefetch: jest.fn(), // Add other methods if needed
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  // Add any other properties/methods your component might use
});

// Mock Server Actions
jest.mock('@/lib/server-actions/auth-actions', () => ({
  getSessionAction: jest.fn(),
  loginAction: jest.fn(),
  registerAction: jest.fn(),
  loginWithGoogleAction: jest.fn(),
  logoutAction: jest.fn(),
}));

// Mock Supabase Client and Auth State Change
const mockUnsubscribe = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
}));
const mockSupabaseClient = {
  auth: {
    onAuthStateChange: mockOnAuthStateChange,
  },
};
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock UserProfileProvider (simple pass-through)
jest.mock('@/context/user-profile-context', () => ({
  UserProfileProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Logger
jest.mock('@/utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// --- Helper Components ---

// A simple component to display auth state for testing
const TestComponent = () => {
  const { user, session, loading, error, login, register, logout, loginWithGoogle, clearError } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading...' : 'Loaded'}</div>
      <div data-testid="user">{user ? `User: ${user.id}` : 'No User'}</div>
      <div data-testid="session">{session ? `Session: ${session.access_token}` : 'No Session'}</div>
      <div data-testid="error">{error ? `Error: ${error}` : 'No Error'}</div>
      <button onClick={() => login('test@test.com', 'password')}>Login</button>
      <button onClick={() => register('new@test.com', 'password')}>Register</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => loginWithGoogle()}>Login Google</button>
      <button onClick={() => clearError()}>Clear Error</button>
    </div>
  );
};

// --- Test Data ---
const mockUser: User = {
  id: 'user-123',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
  expires_in: 3600,
  token_type: 'bearer',
};

const mockAuthError: AuthError = {
    name: 'AuthApiError',
    message: 'Invalid credentials',
    status: 400,
};


// --- Test Suite ---

describe('AuthProvider', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush, replace: mockRouterReplace });
    // Default mock implementations
    (AuthActions.getSessionAction as jest.Mock).mockResolvedValue(null); // Start with no session
    (AuthActions.loginAction as jest.Mock).mockResolvedValue({ data: { user: null, session: null }, error: null });
    (AuthActions.registerAction as jest.Mock).mockResolvedValue({ data: { user: null, session: null }, error: null });
    (AuthActions.loginWithGoogleAction as jest.Mock).mockResolvedValue({ error: null });
    (AuthActions.logoutAction as jest.Mock).mockResolvedValue({ error: null });
    mockOnAuthStateChange.mockImplementation((callback) => {
        // Store the callback to simulate events later if needed
        (mockOnAuthStateChange as any).callback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
  });

  it('should initialize with loading state and fetch session', async () => {
    (AuthActions.getSessionAction as jest.Mock).mockResolvedValue(mockSession);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    expect(AuthActions.getSessionAction).toHaveBeenCalledTimes(1);

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`);
      expect(screen.getByTestId('session')).toHaveTextContent(`Session: ${mockSession.access_token}`);
      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  it('should handle session fetch error', async () => {
    const sessionError = new Error('Failed to fetch session');
    (AuthActions.getSessionAction as jest.Mock).mockRejectedValue(sessionError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('session')).toHaveTextContent('No Session');
      expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${sessionError.message}`);
    });
  });

  it('should handle successful login', async () => {
    (AuthActions.loginAction as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    // Trigger login
    await act(async () => {
      screen.getByRole('button', { name: 'Login' }).click();
    });

    // Check state after login
    await waitFor(() => {
      expect(AuthActions.loginAction).toHaveBeenCalledWith('test@test.com', 'password');
      expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`);
      expect(screen.getByTestId('session')).toHaveTextContent(`Session: ${mockSession.access_token}`);
      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
      expect(mockRouterPush).toHaveBeenCalledWith('/app/lessons');
    });
  });

  it('should handle failed login', async () => {
    (AuthActions.loginAction as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    await act(async () => {
      screen.getByRole('button', { name: 'Login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${mockAuthError.message}`);
    });
    expect(AuthActions.loginAction).toHaveBeenCalledWith('test@test.com', 'password');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('session')).toHaveTextContent('No Session');
    expect(mockRouterPush).not.toHaveBeenCalled();

  });

  it('should handle successful registration', async () => {
    const newUser = { ...mockUser, id: 'new-user-456' };
    const newSession = { ...mockSession, user: newUser, access_token: 'new-access-token' };
    (AuthActions.registerAction as jest.Mock).mockResolvedValue({
      data: { user: newUser, session: newSession },
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    await act(async () => {
      screen.getByRole('button', { name: 'Register' }).click();
    });

    await waitFor(() => {
      expect(AuthActions.registerAction).toHaveBeenCalledWith('new@test.com', 'password');
      expect(screen.getByTestId('user')).toHaveTextContent(`User: ${newUser.id}`);
      expect(screen.getByTestId('session')).toHaveTextContent(`Session: ${newSession.access_token}`);
      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
      expect(mockRouterPush).toHaveBeenCalledWith('/app/onboarding'); // Check onboarding redirect
    });
  });

  it('should handle failed registration', async () => {
    // Arrange: Mock the action to return an error
    const registerError: AuthError = { name: 'AuthApiError', message: 'User already exists', status: 409 };
    (AuthActions.registerAction as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: registerError,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    // Act: Trigger the register action
    await act(async () => {
      screen.getByRole('button', { name: 'Register' }).click();
    });

    // Assert: Wait for the error message state update
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${registerError.message}`);
    });

    // Assert: Check other state aspects
    expect(AuthActions.registerAction).toHaveBeenCalledWith('new@test.com', 'password');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('session')).toHaveTextContent('No Session');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });



  it('should handle successful logout', async () => {
    // Start logged in
    (AuthActions.getSessionAction as jest.Mock).mockResolvedValue(mockSession);
    (AuthActions.logoutAction as jest.Mock).mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial login state
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`));

    // Trigger logout
    await act(async () => {
      screen.getByRole('button', { name: 'Logout' }).click();
    });

    // Check state after logout
    await waitFor(() => {
      expect(AuthActions.logoutAction).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('user')).toHaveTextContent('No User');
      expect(screen.getByTestId('session')).toHaveTextContent('No Session');
      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  it('should handle failed logout', async () => {
    const logoutError: AuthError = { name: 'AuthApiError', message: 'Logout failed', status: 500 };
    // Start logged in
    (AuthActions.getSessionAction as jest.Mock).mockResolvedValue(mockSession);
    (AuthActions.logoutAction as jest.Mock).mockResolvedValue({ error: logoutError });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`));

    await act(async () => {
        screen.getByRole('button', { name: 'Logout' }).click();
    });

    await waitFor(() => {
      expect(AuthActions.logoutAction).toHaveBeenCalledTimes(1);
      // User/session might still be set if logout fails server-side but client doesn't clear
      // However, the provider *does* clear them optimistically before checking error in the `finally`
      // Let's check if the error is set
      expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${logoutError.message}`);
      // State might still be logged in if only error is set
      expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`);
      expect(screen.getByTestId('session')).toHaveTextContent(`Session: ${mockSession.access_token}`);
    });
  });

  it('should call loginWithGoogle action', async () => {
     (AuthActions.loginWithGoogleAction as jest.Mock).mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    await act(async () => {
      screen.getByRole('button', { name: 'Login Google' }).click();
    });

    await waitFor(() => {
        expect(AuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
        // State shouldn't change immediately, relies on redirect and onAuthStateChange
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
        expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  it('should handle error from loginWithGoogle action', async () => {
    // Arrange: Mock the action to return an error
    const googleError: AuthError = { name: 'AuthApiError', message: 'Google Auth Failed', status: 500 };
    (AuthActions.loginWithGoogleAction as jest.Mock).mockResolvedValue({ error: googleError });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));

    // Act: Trigger the google login action
    await act(async () => {
      screen.getByRole('button', { name: 'Login Google' }).click();
    });

    // Assert: Wait for the error message state update
    await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${googleError.message}`);
    });

    // Assert: Check other state aspects
    expect(AuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user')).toHaveTextContent('No User'); // State shouldn't change here
    expect(screen.getByTestId('session')).toHaveTextContent('No Session');
  });

  it('should clear error when clearError is called', async () => {
    const sessionError = new Error('Initial Error');
    (AuthActions.getSessionAction as jest.Mock).mockRejectedValue(sessionError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(`Error: ${sessionError.message}`);
    });

    // Click clear error
    await act(async () => {
      screen.getByRole('button', { name: 'Clear Error' }).click();
    });

    // Check error is cleared
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
  });

  it('should update state on SIGNED_IN auth state change', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Loaded'));
    expect(screen.getByTestId('user')).toHaveTextContent('No User');

    // Simulate Supabase firing the event
    await act(async () => {
      const callback = (mockOnAuthStateChange as any).callback;
      if (callback) {
        callback('SIGNED_IN', mockSession);
      }
    });

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`);
        expect(screen.getByTestId('session')).toHaveTextContent(`Session: ${mockSession.access_token}`);
    });
  });

  it('should update state and redirect on SIGNED_OUT auth state change when on /app', async () => {
     // Mock window.location
     const originalLocation = window.location;
     delete (window as any).location;
     window.location = { ...originalLocation, pathname: '/app/somepage' };

    // Start logged in
    (AuthActions.getSessionAction as jest.Mock).mockResolvedValue(mockSession);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(`User: ${mockUser.id}`));

    // Simulate Supabase firing the event
    await act(async () => {
      const callback = (mockOnAuthStateChange as any).callback;
      if (callback) {
        callback('SIGNED_OUT', null);
      }
    });

    await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
        expect(screen.getByTestId('session')).toHaveTextContent('No Session');
        expect(mockRouterReplace).toHaveBeenCalledWith('/app/login');
    });

     // Restore window.location
     window.location = originalLocation;
  });

   it('should unsubscribe from auth state changes on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

   it('useAuth should throw error when used outside AuthProvider', () => {
    // Hide console.error output for this specific test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const ErrorComponent = () => {
        try {
            useAuth();
        } catch (e: any) {
            return <div>Error: {e.message}</div>;
        }
        return <div>No error</div>;
    };

    render(<ErrorComponent />);

    expect(screen.getByText('Error: useAuth must be used within an AuthProvider')).toBeInTheDocument();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

});