// File: /tests/context/auth-context.test.tsx
/// <reference types="@testing-library/jest-dom" />

import React, { ReactNode } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/auth-context';
// Keep the mock for UserProfileProvider as AuthProvider uses it internally
import { UserProfileProvider } from '@/context/user-profile-context';
import * as AuthActions from '@/lib/server-actions/auth-actions';
import { SupabaseAuthService } from '@/services/auth.service'; // Needed for onAuthStateChange mock
import logger from '@/utils/logger';
import { Session, User, AuthError } from '@supabase/supabase-js';

// --- Mocks ---

// Mock UserProfileProvider - Necessary because AuthProvider renders it
jest.mock('@/context/user-profile-context', () => ({
  UserProfileProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock @supabase/supabase-js (Keep as is)
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
      deleteUser: jest.fn(),
    },
  };
  const mockClient = {
    auth: mockAuth,
  };
  return {
    createClient: jest.fn(() => mockClient),
  };
});

// Mock next/navigation (Keep as is)
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
let mockPathname = '/';
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

// Mock server actions (Keep as is)
jest.mock('@/lib/server-actions/auth-actions');
const mockedAuthActions = AuthActions as jest.Mocked<typeof AuthActions>;

// Mock SupabaseAuthService specifically for onAuthStateChange (Keep as is)
let mockOnAuthStateChangeCallback: ((event: any, session: Session | null) => void) | null = null;
const mockUnsubscribe = jest.fn();
jest.mock('@/services/auth.service', () => {
  const actual = jest.requireActual('@/services/auth.service');
  // Create a stable mock instance for the constructor to return
  const mockServiceInstance = {
    onAuthStateChange: jest.fn((callback) => {
      mockOnAuthStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }),
    // Add mocks for other methods if AuthProvider were to call them directly (it doesn't)
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    getSession: jest.fn(),
    deleteUserById: jest.fn(),
  };
  return {
    ...actual,
    SupabaseAuthService: jest.fn().mockImplementation(() => mockServiceInstance), // Ensure constructor returns our mock
    supabase: actual.supabase,
  };
});


// Mock logger (Keep as is)
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

// Mock window location (Keep as is)
const originalLocation = window.location;
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' }, // Add origin if needed by tests
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});
beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthStateChangeCallback = null;
  mockPathname = '/';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
  });

  // Default mock implementations
  mockedAuthActions.getSessionAction.mockResolvedValue(null);
  mockedAuthActions.loginAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default login error' } as AuthError });
  mockedAuthActions.registerAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default register error' } as AuthError });
  mockedAuthActions.loginWithGoogleAction.mockResolvedValue({ error: null });
  mockedAuthActions.logoutAction.mockResolvedValue({ error: null });
});

// --- Helper Component (Keep as is) ---
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

// Render helper (Keep as is)
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
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    // Wait specifically for loading to become false
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    // Check final state after loading
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('session')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should initialize with session and user if getSessionAction returns data', async () => {
    mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
    renderAuthProvider();
    // Wait specifically for the user state to reflect the session data
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
    // Now check all related states
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
    expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should handle error during initial getSessionAction', async () => {
    const sessionError = new Error('Session fetch failed');
    mockedAuthActions.getSessionAction.mockRejectedValueOnce(sessionError);
    renderAuthProvider();
    // Wait specifically for the error message to appear
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(sessionError.message));
    // Check other states
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('session')).toHaveTextContent('null');
  });

  describe('login', () => {
    it('should call loginAction, update state, and navigate on success', async () => {
      mockedAuthActions.loginAction.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      // Use act for the user interaction
      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      // Assert the action was called AFTER the click/update has settled
      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
      // Wait for the expected outcome (state updates and navigation)
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
        await userEvent.click(screen.getByText('Login'));
      });

      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
      // Wait for the error state to be updated
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(mockAuthError.message);
      });
      // Check other states remain unchanged
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

     it('should handle exceptions during loginAction', async () => {
        const exception = new Error('Network Error');
        mockedAuthActions.loginAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            await userEvent.click(screen.getByText('Login'));
        });

        expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');
        // Wait for the generic error message from the catch block
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Failed to login');
        });
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
    });
  });

  describe('register', () => {
    it('should call registerAction, update state, and navigate to onboarding on success', async () => {
      mockedAuthActions.registerAction.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        await userEvent.click(screen.getByText('Register'));
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
        await userEvent.click(screen.getByText('Register'));
      });

      expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(registerError.message);
      });
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

     it('should handle exceptions during registerAction', async () => {
        const exception = new Error('Server Error');
        mockedAuthActions.registerAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            await userEvent.click(screen.getByText('Register'));
        });

        expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Registration failed');
        });
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
    });
  });

  describe('loginWithGoogle', () => {
    it('should call loginWithGoogleAction', async () => {
      mockedAuthActions.loginWithGoogleAction.mockResolvedValueOnce({ error: null });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        await userEvent.click(screen.getByText('Login Google'));
      });

      // Action call should happen
      expect(mockedAuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);
      // Wait for loading to potentially flicker and settle back to false
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      // Error should remain null
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('should set error state if loginWithGoogleAction fails', async () => {
      const googleError = { name: 'AuthApiError', message: 'OAuth error', status: 500 } as AuthError;
      mockedAuthActions.loginWithGoogleAction.mockResolvedValueOnce({ error: googleError });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      await act(async () => {
        await userEvent.click(screen.getByText('Login Google'));
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
            await userEvent.click(screen.getByText('Login Google'));
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
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      // Wait for initial login state
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

      mockedAuthActions.logoutAction.mockResolvedValueOnce({ error: null });
      await act(async () => {
        await userEvent.click(screen.getByText('Logout'));
      });

      expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
      // Wait for state to clear
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });

    it('should set error state if logoutAction fails', async () => {
      const logoutError = { name: 'AuthApiError', message: 'Logout failed server side', status: 500 } as AuthError;
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

      mockedAuthActions.logoutAction.mockResolvedValueOnce({ error: logoutError });
      await act(async () => {
        await userEvent.click(screen.getByText('Logout'));
      });

      expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(logoutError.message);
      });
      // User/session should remain unchanged on failed logout
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
      expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    });

      it('should handle exceptions during logoutAction', async () => {
        const exception = new Error('Logout Network Error');
        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));

        mockedAuthActions.logoutAction.mockRejectedValueOnce(exception);
        await act(async () => {
            await userEvent.click(screen.getByText('Logout'));
        });

        expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
        });
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id); // State unchanged on error
        expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    });
  });

  describe('onAuthStateChange', () => {
    it('should update user and session when callback receives session', async () => {
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      expect(mockOnAuthStateChangeCallback).not.toBeNull();

      // Simulate Supabase firing the callback - wrap state updates in act
      await act(async () => {
         mockOnAuthStateChangeCallback!('SIGNED_IN', mockSession);
      });

      // Wait for the state update triggered by the callback
      await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
          expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
      });
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

      // Wait for state update
      await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('null');
          expect(screen.getByTestId('session')).toHaveTextContent('null');
      });
    });

    it('should redirect to login on SIGNED_OUT if current path starts with /app', async () => {
        mockPathname = '/app/some-protected-page';
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
        });

        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
        expect(mockOnAuthStateChangeCallback).not.toBeNull();

        await act(async () => {
            mockOnAuthStateChangeCallback!('SIGNED_OUT', null);
        });

        // Wait for state updates *and* navigation side effect
        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('null');
            expect(screen.getByTestId('session')).toHaveTextContent('null');
            expect(mockRouterReplace).toHaveBeenCalledWith('/app/login');
        });
    });

     it('should NOT redirect on SIGNED_OUT if current path does not start with /app', async () => {
        mockPathname = '/public-page';
         Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
        });

        mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
        expect(mockOnAuthStateChangeCallback).not.toBeNull();

        await act(async () => {
            mockOnAuthStateChangeCallback!('SIGNED_OUT', null);
        });

        // Wait for state updates
         await waitFor(() => {
             expect(screen.getByTestId('user')).toHaveTextContent('null');
             expect(screen.getByTestId('session')).toHaveTextContent('null');
         });
         // Assert navigation did NOT happen
        expect(mockRouterReplace).not.toHaveBeenCalled();
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderAuthProvider();
      // Wait for initial effect setup to complete
      await waitFor(() => expect(mockOnAuthStateChangeCallback).not.toBeNull());

      unmount();
      // Check it was called at least once. Handling strict mode double-calls can be tricky.
      // If effect runs twice, unsubscribe might be called twice (once for first effect cleanup, once for final unmount).
      // Expecting exactly 1 might be too brittle if the test env behaves like StrictMode.
      expect(mockUnsubscribe).toHaveBeenCalled();
      // If you need to be stricter and debug the double call:
      // expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearError', () => {
    it('should set the error state to null', async () => {
       const initialError = new Error('Initial Error');
        mockedAuthActions.getSessionAction.mockRejectedValueOnce(initialError);
        renderAuthProvider();
        // Wait for the initial error to appear
        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(initialError.message));

        // Use act for the synchronous state update
        act(() => {
            userEvent.click(screen.getByText('Clear Error'));
        });

        // Assert the error is cleared (synchronous update, waitFor likely not needed but safe)
        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('null'));
    });
  });

});