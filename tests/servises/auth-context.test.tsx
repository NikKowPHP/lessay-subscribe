// File: /tests/context/auth-context.test.tsx
/// <reference types="@testing-library/jest-dom" />

import React, { ReactNode } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { UserProfileProvider } from '@/context/user-profile-context'; // Mock this
import * as AuthActions from '@/lib/server-actions/auth-actions';
import { SupabaseAuthService } from '@/services/auth.service'; // Needed for onAuthStateChange mock
import logger from '@/utils/logger';
import { Session, User, AuthError } from '@supabase/supabase-js';

// --- Mocks ---

// Mock UserProfileProvider
jest.mock('@/context/user-profile-context', () => ({
  UserProfileProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));



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

// Mock next/navigation
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockPathname = '/'; // Default pathname
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    // Add other router methods if needed
  }),
  // Mock pathname access if needed directly (though window.location is used in context)
}));

// Mock server actions
jest.mock('@/lib/server-actions/auth-actions');
const mockedAuthActions = AuthActions as jest.Mocked<typeof AuthActions>;

// Mock SupabaseAuthService specifically for onAuthStateChange
let mockOnAuthStateChangeCallback: ((event: any, session: Session | null) => void) | null = null;
const mockUnsubscribe = jest.fn();
jest.mock('@/services/auth.service', () => {
  const actual = jest.requireActual('@/services/auth.service');
  return {
    ...actual, // Keep actual exports like SupabaseAuthService class itself if needed elsewhere
    SupabaseAuthService: jest.fn().mockImplementation(() => ({
      onAuthStateChange: jest.fn((callback) => {
        mockOnAuthStateChangeCallback = callback; // Capture the callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      // Mock other methods if they were directly called (they aren't in this context)
    })),
    // Keep supabase export if needed, though actions are primary interaction
    supabase: actual.supabase,
  };
});

// Mock logger
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

// Mock window location (used in onAuthStateChange effect)
const originalLocation = window.location;
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: mockPathname },
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', { // Restore original location
    configurable: true,
    value: originalLocation,
  });
});
beforeEach(() => {
  // Reset mocks and state before each test
  jest.clearAllMocks();
  mockOnAuthStateChangeCallback = null;
  mockPathname = '/'; // Reset path
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: mockPathname },
  });

  // Default mock implementations
  mockedAuthActions.getSessionAction.mockResolvedValue(null); // Default: no session
  mockedAuthActions.loginAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default login error' } as AuthError });
  mockedAuthActions.registerAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default register error' } as AuthError });
  mockedAuthActions.loginWithGoogleAction.mockResolvedValue({ error: null });
  mockedAuthActions.logoutAction.mockResolvedValue({ error: null });
});

// --- Helper Component ---
const TestComponent = () => {
  const { user, session, loading, error, login, register, loginWithGoogle, logout, clearError } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="error">{error || 'null'}</div>
      <div data-testid="user">{user ? user.id : 'null'}</div>
      <div data-testid="session">{session ? session.access_token : 'null'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => register('new@example.com', 'newpass')}>Register</button>
      <button onClick={loginWithGoogle}>Login Google</button>
      <button onClick={logout}>Logout</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

// Render helper
const renderAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
};

// --- Test Suite ---
describe('AuthProvider', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
  const mockSession = { access_token: 'abc-token', user: mockUser } as Session;
  const mockAuthError = { name: 'AuthApiError', message: 'Invalid credentials', status: 400 } as AuthError;

  it('should render children and initialize with loading state', async () => {
    mockedAuthActions.getSessionAction.mockResolvedValueOnce(null);
    renderAuthProvider();
    // Initially loading is true, then becomes false after getSession resolves
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('session')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should initialize with session and user if getSessionAction returns data', async () => {
    mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
    renderAuthProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
    expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should handle error during initial getSessionAction', async () => {
    const sessionError = new Error('Session fetch failed');
    mockedAuthActions.getSessionAction.mockRejectedValueOnce(sessionError);
    renderAuthProvider();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('session')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent(sessionError.message);
  });

  describe('login', () => {
    it('should call loginAction, update state, and navigate on success', async () => {
      mockedAuthActions.loginAction.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false')); // Wait for initial load

      await act(async () => {
        userEvent.click(screen.getByText('Login'));
      });

      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
        expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
        expect(screen.getByTestId('error')).toHaveTextContent('null');
        expect(mockRouterPush).toHaveBeenCalledWith('/app/lessons');
      });
    });

    it('should call loginAction and set error state on failure', async () => {
      mockedAuthActions.loginAction.mockResolvedValueOnce({ data: { user: null, session: null }, error: mockAuthError });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        userEvent.click(screen.getByText('Login'));
      });

      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('error')).toHaveTextContent(mockAuthError.message);
        expect(mockRouterPush).not.toHaveBeenCalled();
      });
    });

     it('should handle exceptions during loginAction', async () => {
        const exception = new Error('Network Error');
        mockedAuthActions.loginAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            userEvent.click(screen.getByText('Login'));
        });

        expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Failed to login'); // Uses generic message for non-AuthError
            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('session')).toHaveTextContent('null');
        });
    });
  });

  describe('register', () => {
    it('should call registerAction, update state, and navigate to onboarding on success', async () => {
      mockedAuthActions.registerAction.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        userEvent.click(screen.getByText('Register'));
      });

      expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
        expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
        expect(screen.getByTestId('error')).toHaveTextContent('null');
        expect(mockRouterPush).toHaveBeenCalledWith('/app/onboarding');
      });
    });

    it('should call registerAction and set error state on failure', async () => {
      const registerError = { name: 'AuthApiError', message: 'User already exists', status: 400 } as AuthError;
      mockedAuthActions.registerAction.mockResolvedValueOnce({ data: { user: null, session: null }, error: registerError });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        userEvent.click(screen.getByText('Register'));
      });

      expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('error')).toHaveTextContent(registerError.message);
        expect(mockRouterPush).not.toHaveBeenCalled();
      });
    });

     it('should handle exceptions during registerAction', async () => {
        const exception = new Error('Server Error');
        mockedAuthActions.registerAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            userEvent.click(screen.getByText('Register'));
        });

        expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Registration failed');
            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('session')).toHaveTextContent('null');
        });
    });
  });

  describe('loginWithGoogle', () => {
    it('should call loginWithGoogleAction', async () => {
      mockedAuthActions.loginWithGoogleAction.mockResolvedValueOnce({ error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        userEvent.click(screen.getByText('Login Google'));
      });

      expect(mockedAuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('should set error state if loginWithGoogleAction fails', async () => {
      const googleError = { name: 'AuthApiError', message: 'OAuth error', status: 500 } as AuthError;
      mockedAuthActions.loginWithGoogleAction.mockResolvedValueOnce({ error: googleError });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        userEvent.click(screen.getByText('Login Google'));
      });

      expect(mockedAuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(googleError.message);
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should handle exceptions during loginWithGoogleAction', async () => {
        const exception = new Error('Google Unavailable');
        mockedAuthActions.loginWithGoogleAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            userEvent.click(screen.getByText('Login Google'));
        });

        expect(mockedAuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Google login failed');
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });
    });
  });

  describe('logout', () => {
    it('should call logoutAction and clear user/session on success', async () => {
      // Setup initial logged-in state
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

      // Perform logout
      mockedAuthActions.logoutAction.mockResolvedValueOnce({ error: null });
      await act(async () => {
        userEvent.click(screen.getByText('Logout'));
      });

      expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('should set error state if logoutAction fails', async () => {
      const logoutError = { name: 'AuthApiError', message: 'Logout failed server side', status: 500 } as AuthError;
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession); // Start logged in
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

      mockedAuthActions.logoutAction.mockResolvedValueOnce({ error: logoutError });
      await act(async () => {
        userEvent.click(screen.getByText('Logout'));
      });

      expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(logoutError.message);
        // User/session might still be present if logout fails
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
        expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
      });
    });

      it('should handle exceptions during logoutAction', async () => {
        const exception = new Error('Logout Network Error');
        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession); // Start logged in
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

        mockedAuthActions.logoutAction.mockRejectedValueOnce(exception);
        await act(async () => {
            userEvent.click(screen.getByText('Logout'));
        });

        expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
            expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id); // State unchanged on error
        });
    });
  });

  describe('onAuthStateChange', () => {
    it('should update user and session when callback receives session', async () => {
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      expect(mockOnAuthStateChangeCallback).not.toBeNull();

      // Simulate Supabase firing the callback
      await act(async () => {
        mockOnAuthStateChangeCallback!('SIGNED_IN', mockSession);
      });

      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
      expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    });

    it('should clear user and session when callback receives null session', async () => {
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession); // Start logged in
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      expect(mockOnAuthStateChangeCallback).not.toBeNull();

      // Simulate Supabase firing the callback for sign out
      await act(async () => {
        mockOnAuthStateChangeCallback!('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
    });

    it('should redirect to login on SIGNED_OUT if current path starts with /app', async () => {
        // Set path before rendering
        mockPathname = '/app/some-protected-page';
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, pathname: mockPathname },
        });

        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession); // Start logged in
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
        expect(mockOnAuthStateChangeCallback).not.toBeNull();

        // Simulate Supabase firing the callback for sign out
        await act(async () => {
            mockOnAuthStateChangeCallback!('SIGNED_OUT', null);
        });

        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(mockRouterReplace).toHaveBeenCalledWith('/app/login'); // Use replace for this case
    });

     it('should NOT redirect on SIGNED_OUT if current path does not start with /app', async () => {
        // Set path before rendering
        mockPathname = '/public-page';
         Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, pathname: mockPathname },
        });

        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession); // Start logged in
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
        expect(mockOnAuthStateChangeCallback).not.toBeNull();

        // Simulate Supabase firing the callback for sign out
        await act(async () => {
            mockOnAuthStateChangeCallback!('SIGNED_OUT', null);
        });

        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(mockRouterReplace).not.toHaveBeenCalled();
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearError', () => {
    it('should set the error state to null', async () => {
       const initialError = new Error('Initial Error');
        mockedAuthActions.getSessionAction.mockRejectedValueOnce(initialError);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(initialError.message));

        act(() => {
            userEvent.click(screen.getByText('Clear Error'));
        });

        expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

});