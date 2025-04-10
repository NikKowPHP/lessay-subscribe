// src/services/mock-auth-service.service.ts
import { IAuthService } from '@/services/auth.service'
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js'
import logger from '@/utils/logger'

// In-memory store for the mock session (persists only while the server process runs)
let mockSessionStore: Session | null = null;

// Store the auth state callback globally within this module for the mock service
let globalAuthStateCallback: ((event: AuthChangeEvent, session: Session | null) => Promise<void> | void) | null = null;

// Helper to notify auth state change
const notifyAuthStateChange = (event: AuthChangeEvent, session: Session | null) => {
  if (globalAuthStateCallback) {
    // Use Promise.resolve().then() to mimic async behavior of real auth changes
    Promise.resolve().then(() => {
      if (globalAuthStateCallback) { // Check again inside the promise in case it was unset
        globalAuthStateCallback(event, session);
      }
    });
  }
};

export class MockAuthService implements IAuthService {


  private authStateCallback: ((event: AuthChangeEvent, session: Session | null) => Promise<void> | void) | null = null;
  private readonly API_URL = '/api/mock-auth';



  async login(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {



    logger.log('login (mocked)', email, password);
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        email,
        password
      })
    });

    if (!response.ok) {
      throw new Error('Mock login failed');
    }

    const { user, session } = await response.json();

    if (this.authStateCallback) {
      this.authStateCallback('SIGNED_IN', session);
    }

    return { user, session };
  }

  async logout(): Promise<void> {
    logger.log('logout (mocked)');
    await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'logout'
      })
    });

    if (this.authStateCallback) {
      this.authStateCallback('SIGNED_OUT', null);
    }
  }

  async getSession(): Promise<Session | null> {
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getSession'
      })
    });

    if (!response.ok) {
      return null;
    }

    const { session } = await response.json();
    return session;
  }




  async register(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    logger.log('register (mocked)', email, password);
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        email,
        password
      })
    });

    if (!response.ok) {
      throw new Error('Mock registration failed');
    }

    const { user, session } = await response.json();

    if (this.authStateCallback) {
      this.authStateCallback('SIGNED_IN', session);
    }

    return { user, session };
  }

  async loginWithGoogle(): Promise<void> {
    logger.log('loginWithGoogle (mocked)');
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'googleLogin'
      })
    });

    if (!response.ok) {
      throw new Error('Mock Google login failed');
    }

    const { session } = await response.json();

    if (this.authStateCallback) {
      this.authStateCallback('SIGNED_IN', session);
    }
  }


  // Mock implementation for deleteUserById
  async deleteUserById(userId: string): Promise<{ error: any | null }> {
    logger.log(`deleteUserById (mocked) for user: ${userId}`, { apiUrl: this.API_URL });

    // Simulate API call
    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUser', userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Mock deleteUserById failed:', { status: response.status, error: errorText });
      return { error: { message: `Mock delete failed: ${errorText}` } };
    }

    // If the deleted user was the currently logged-in user, clear the session
    if (mockSessionStore?.user?.id === userId) {
      logger.log(`Deleted user ${userId} was the logged-in user. Clearing mock session.`);
      mockSessionStore = null;
      notifyAuthStateChange('SIGNED_OUT', null);
    }

    logger.info(`Mock deleteUserById successful for user: ${userId}`);
    return { error: null };
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void> | void) {
    logger.log('onAuthStateChange (mocked) - setting up listener');
    globalAuthStateCallback = callback; // Store the callback globally for this module

    // Immediately notify with the current state
    const currentSession = mockSessionStore ? { ...mockSessionStore } : null;
    const initialEvent: AuthChangeEvent = currentSession ? 'INITIAL_SESSION' : 'SIGNED_OUT';
    notifyAuthStateChange(initialEvent, currentSession);


    // Return a mock subscription object with an unsubscribe method
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            logger.log('Mock auth state subscription unsubscribed');
            globalAuthStateCallback = null; // Clear the global callback
          }
        } as Subscription
      }
    };
  }
}
