// File: /tests/context/auth-context.test.tsx
/// <reference types="@testing-library/jest-dom" />

import React, { ReactNode } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/auth-context';
// Keep the mock for UserProfileProvider as AuthProvider uses it internally
import { UserProfileProvider } from '@/context/user-profile-context';
import * as AuthActions from '@/lib/server-actions/auth-actions';
// Keep SupabaseAuthService mock for onAuthStateChange logic within AuthProvider
import { SupabaseAuthService } from '@/services/auth.service';
import logger from '@/utils/logger';
import { Session, User, AuthError } from '@supabase/supabase-js';

// Increase timeout for async operations
jest.setTimeout(15000); // Increased timeout to 15 seconds

// --- Mocks ---

// Mock UserProfileProvider - Necessary because AuthProvider renders it
jest.mock('@/context/user-profile-context', () => ({
  UserProfileProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock @supabase/supabase-js (Keep as is - AuthProvider doesn't use it directly)
jest.mock('@supabase/supabase-js', () => {
  const mockAuth = {
    // Mocks for methods potentially called by SupabaseAuthService instance if not fully mocked
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
    // Export AuthError class mock if needed by tests directly
    AuthError: class MockAuthError extends Error {
      status?: number;
      constructor(message: string, status?: number) {
        super(message);
        this.name = 'AuthApiError'; // Or AuthError depending on Supabase version/usage
        this.status = status;
      }
    }
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
  // Mock usePathname if AuthProvider uses it directly (it uses window.location here)
  // usePathname: () => mockPathname,
}));

// Mock server actions (Keep as is)
jest.mock('@/lib/server-actions/auth-actions');
const mockedAuthActions = AuthActions as jest.Mocked<typeof AuthActions>;

// Mock SupabaseAuthService specifically for onAuthStateChange (Keep as is)
// This mock is crucial because AuthProvider creates an instance of it.
let mockOnAuthStateChangeCallback: ((event: any, session: Session | null) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockAuthServiceInstance = {
    // Mock the specific method AuthProvider calls
    onAuthStateChange: jest.fn((callback) => {
      mockOnAuthStateChangeCallback = callback;
      // Return the expected subscription structure
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }),
    // Add empty mocks for other methods if needed, though AuthProvider doesn't call them directly
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    logout: jest.fn(),
    getSession: jest.fn(),
    deleteUserById: jest.fn(),
};
jest.mock('@/services/auth.service', () => {
    const actual = jest.requireActual('@/services/auth.service');
    return {
        ...actual, // Keep other exports like IAuthService if needed elsewhere
        // Mock the constructor to return our controlled instance
        SupabaseAuthService: jest.fn().mockImplementation(() => mockAuthServiceInstance),
        // Keep the actual supabase export if needed by other parts (though actions use it directly)
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
    value: { ...originalLocation, pathname: '/', origin: 'http://localhost:3000' }, // Ensure origin is set
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
  mockOnAuthStateChangeCallback = null; // Reset callback capture
  mockPathname = '/'; // Reset pathname mock
  // Reset window.location for each test
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
  });

  // Provide default mock implementations for server actions
  mockedAuthActions.getSessionAction.mockResolvedValue(null);
  mockedAuthActions.loginAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default login error' } as AuthError });
  mockedAuthActions.registerAction.mockResolvedValue({ data: { user: null, session: null }, error: { name: 'AuthError', message: 'Default register error' } as AuthError });
  mockedAuthActions.loginWithGoogleAction.mockResolvedValue({ error: null });
  mockedAuthActions.logoutAction.mockResolvedValue({ error: null });

  // Reset the mock service instance calls if needed (though constructor mock handles this)
  // mockAuthServiceInstance.onAuthStateChange.mockClear();
  // mockUnsubscribe.mockClear();
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
  const mockUser = { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {} } as User;
  const mockSession = { access_token: 'abc-token', user: mockUser, expires_at: Date.now() + 3600*1000, expires_in: 3600, refresh_token: 'ref', token_type: 'bearer' } as Session;
  const mockAuthError = { name: 'AuthApiError', message: 'Invalid credentials', status: 400 } as AuthError;
  const sessionError = new Error('Session fetch failed'); // Use standard Error for rejected promises

  it('should render children and initialize with loading state, then no user', async () => {
    mockedAuthActions.getSessionAction.mockResolvedValueOnce(null);
    renderAuthProvider();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    // Wait for a definitive state *after* loading finishes and potential null user is set
    // This waitFor implicitly handles the async updates from the useEffect's getSessionAction.then()
    await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null'); // Check final user state too
    });
    // Assertions after waitFor
    expect(screen.getByTestId('session')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(mockedAuthActions.getSessionAction).toHaveBeenCalledTimes(1);
  });

  it('should initialize with session and user if getSessionAction returns data', async () => {
    mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
    renderAuthProvider();
    // Wait specifically for the user state to reflect the session data, implying loading is done
    // This waitFor implicitly handles the async updates from the useEffect's getSessionAction.then()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
    // Now check all related states, should be stable now
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(mockedAuthActions.getSessionAction).toHaveBeenCalledTimes(1);
  });

  it('should handle error during initial getSessionAction', async () => {
    mockedAuthActions.getSessionAction.mockRejectedValueOnce(sessionError);
    renderAuthProvider();
    // Wait specifically for the error message to appear, implying loading is done
    // This waitFor implicitly handles the async updates from the useEffect's getSessionAction.catch()
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(sessionError.message));
    // Check other states
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('session')).toHaveTextContent('null');
    expect(mockedAuthActions.getSessionAction).toHaveBeenCalledTimes(1);
  });

  describe('login', () => {
    it('should call loginAction, update state, and navigate on success', async () => {
      mockedAuthActions.loginAction.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
      renderAuthProvider();
      // Wait for initial load to ensure useEffect completes before interaction
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      // Use act for the user interaction AND subsequent state updates
      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      // Assert the action was called
      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');

      // Wait for ALL expected outcomes of the login action
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
        expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
        expect(screen.getByTestId('error')).toHaveTextContent('null');
        expect(screen.getByTestId('loading')).toHaveTextContent('false'); // Ensure loading is false again
        expect(mockRouterPush).toHaveBeenCalledWith('/app/lessons');
      });
    });

    it('should call loginAction and set error state on failure', async () => {
      mockedAuthActions.loginAction.mockResolvedValueOnce({ data: { user: null, session: null }, error: mockAuthError });
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      // Wrap click and state updates in act
      await act(async () => {
        await userEvent.click(screen.getByText('Login'));
      });

      expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');

      // Wait for the error state and loading to settle
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(mockAuthError.message);
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Check other states remain unchanged AFTER waitFor
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

     it('should handle exceptions during loginAction', async () => {
        const exception = new Error('Network Error');
        mockedAuthActions.loginAction.mockRejectedValueOnce(exception);
        renderAuthProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        // Wrap click and state updates in act
        await act(async () => {
            // We expect the login promise to reject here, but the component should catch it
            try {
                // The click triggers the login function which calls the rejected action
                const loginButton = screen.getByText('Login');
                await userEvent.click(loginButton);
                // Need to wait for the promise inside login to potentially settle/reject
                // Although the component catches, await ensures act waits for microtasks
                await Promise.resolve();
            } catch (e) {
                // The component's catch block handles the state update
                // We don't need to assert the caught error here unless debugging
            }
        });

        expect(mockedAuthActions.loginAction).toHaveBeenCalledWith('test@example.com', 'password');

        // Wait for the generic error message from the component's catch block
        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Failed to login'); // Error message from AuthProvider catch block
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(mockRouterPush).not.toHaveBeenCalled();
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
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
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
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
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
            try {
                await userEvent.click(screen.getByText('Register'));
                await Promise.resolve(); // Allow microtasks
            } catch (e) {
                // Component catches
            }
        });

        expect(mockedAuthActions.registerAction).toHaveBeenCalledWith('new@example.com', 'newpass');

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Registration failed'); // Error from component catch
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
        expect(mockRouterPush).not.toHaveBeenCalled();
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
      // Error should remain null as the action succeeded (even if redirect happens elsewhere)
      await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('false');
          expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
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
            try {
                await userEvent.click(screen.getByText('Login Google'));
                await Promise.resolve(); // Allow microtasks
            } catch (e) {
                // Component catches
            }
        });

        expect(mockedAuthActions.loginWithGoogleAction).toHaveBeenCalledTimes(1);

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Google login failed'); // Error from component catch
            expect(screen.getByTestId('loading')).toHaveTextContent('false');
        });
    });
  });

  describe('logout', () => {
    it('should call logoutAction and clear user/session on success', async () => {
      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false')); // Ensure initial load done

      // Mock successful logout
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
      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      // Mock failed logout
      mockedAuthActions.logoutAction.mockResolvedValueOnce({ error: logoutError });

      await act(async () => {
        await userEvent.click(screen.getByText('Logout'));
      });

      expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);

      // Wait for error state to be set
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(logoutError.message);
      });

      // IMPORTANT: User/session should remain unchanged on failed logout
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
      expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
    });

    it('should handle exceptions during logoutAction', async () => {
      const exception = new Error('Logout Network Error');
      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

      // Mock logout action throwing an error
      mockedAuthActions.logoutAction.mockRejectedValueOnce(exception);

      await act(async () => {
          try {
             await userEvent.click(screen.getByText('Logout'));
             await Promise.resolve(); // Allow microtasks
          } catch(e) {
            // Component catches
          }
      });

       expect(mockedAuthActions.logoutAction).toHaveBeenCalledTimes(1);

      // Wait for the error state based on the exception message
      await waitFor(() => {
          expect(screen.getByTestId('error')).toHaveTextContent(exception.message); // Error from component catch
      });

      // IMPORTANT: State should remain unchanged on error
      expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
      expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
  });
  });

  describe('onAuthStateChange', () => {
    // Helper to wait for initial load and ensure callback is ready
    const waitForInitialLoad = async () => {
        await waitFor(() => expect(mockOnAuthStateChangeCallback).not.toBeNull());
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    };

    it('should update user and session when callback receives session (SIGNED_IN)', async () => {
      renderAuthProvider();
      await waitForInitialLoad(); // Wait for setup

      // Simulate Supabase firing the callback - wrap state updates in act
      await act(async () => {
         // Ensure callback exists before calling
         if (mockOnAuthStateChangeCallback) {
            mockOnAuthStateChangeCallback('SIGNED_IN', mockSession);
         }
         await Promise.resolve(); // Allow state updates triggered by callback to settle within act
      });

      // Wait for the state update triggered by the callback
      await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id);
          expect(screen.getByTestId('session')).toHaveTextContent(mockSession.access_token);
      });
    });

    it('should clear user and session when callback receives null session (SIGNED_OUT)', async () => {
      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      // Wait for initial state to reflect login
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitForInitialLoad(); // Ensure callback is ready

      // Simulate SIGNED_OUT event
      await act(async () => {
        if (mockOnAuthStateChangeCallback) {
           mockOnAuthStateChangeCallback('SIGNED_OUT', null);
        }
        await Promise.resolve();
      });

      // Wait for state update
      await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('null');
          expect(screen.getByTestId('session')).toHaveTextContent('null');
      });
    });

    it('should redirect to login on SIGNED_OUT if current path starts with /app', async () => {
      // Set window.location.pathname BEFORE rendering
      mockPathname = '/app/some-protected-page';
      Object.defineProperty(window, 'location', {
          configurable: true,
          value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
      });

      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitForInitialLoad();

      // Simulate SIGNED_OUT event - wrap in act
      await act(async () => {
          if (mockOnAuthStateChangeCallback) {
             mockOnAuthStateChangeCallback('SIGNED_OUT', null);
          }
          await Promise.resolve();
      });

      // Wait for state updates *and* navigation side effect
      await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent('null');
          expect(screen.getByTestId('session')).toHaveTextContent('null');
          expect(mockRouterReplace).toHaveBeenCalledWith('/app/login');
      });
  });

    it('should NOT redirect on SIGNED_OUT if current path does not start with /app', async () => {
      // Set window.location.pathname BEFORE rendering
      mockPathname = '/public-page';
       Object.defineProperty(window, 'location', {
          configurable: true,
          value: { ...originalLocation, pathname: mockPathname, origin: 'http://localhost:3000' },
      });

      // Start logged in
      mockedAuthActions.getSessionAction.mockResolvedValueOnce(mockSession);
      renderAuthProvider();
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(mockUser.id));
      await waitForInitialLoad();

      // Simulate SIGNED_OUT - wrap in act
      await act(async () => {
          if (mockOnAuthStateChangeCallback) {
              mockOnAuthStateChangeCallback('SIGNED_OUT', null);
          }
          await Promise.resolve();
      });

      // Wait for state updates
       await waitFor(() => {
           expect(screen.getByTestId('user')).toHaveTextContent('null');
           expect(screen.getByTestId('session')).toHaveTextContent('null');
       });

      // Ensure no navigation occurred
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
  });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderAuthProvider(); // Render and keep unmount function
      // Wait for initial effect setup to complete and callback to be assigned
      await waitFor(() => expect(mockOnAuthStateChangeCallback).not.toBeNull());

      // Call unmount - No need to wrap unmount itself in act
      unmount();

      // Check if unsubscribe was called
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should set the error state to null', async () => {
       // Start with an error
        mockedAuthActions.getSessionAction.mockRejectedValueOnce(sessionError);
        renderAuthProvider();
        // Wait for the initial error to appear
        await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(sessionError.message));

        // Click the clear error button - wrap in act as it causes a state update
        await act(async () => {
           await userEvent.click(screen.getByText('Clear Error'));
        });

        // Assert the error is cleared
        // No extra waitFor needed here as clearError is synchronous state update within act
        expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

});