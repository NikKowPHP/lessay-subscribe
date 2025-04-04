import { IAuthService } from '@/services/auth.service'
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js'
import logger from '@/utils/logger'
export class MockAuthService implements IAuthService {
  private authStateCallback: ((event: AuthChangeEvent, session: Session | null) => Promise<void> | void) | null = null;

  async login(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    logger.log('login (mocked)', email, password)
    return {
      user: {
        id: 'mock-user-id',
        email: email,
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: [],
        created_at: '2023-10-20T00:00:00Z',
        updated_at: '2023-10-20T00:00:00Z',
        email_confirmed_at: '2023-10-20T00:00:00Z',
        phone_confirmed_at: '2023-10-20T00:00:00Z',
        last_sign_in_at: '2023-10-20T00:00:00Z',
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 1000,
        token_type: 'Bearer',
        user: null,
      } as unknown as Session,
    };
  }

  async logout(): Promise<void> {
    logger.log('logout (mocked)')
    return;
  }

  async getSession(): Promise<Session | null> {
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 1000,
      token_type: 'Bearer',
      user: {
        id: 'mock-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'mock@example.com',
        email_confirmed_at: '2023-10-20T00:00:00Z',
        phone_confirmed_at: '2023-10-20T00:00:00Z',
        last_sign_in_at: '2023-10-20T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: [],
        created_at: '2023-10-20T00:00:00Z',
        updated_at: '2023-10-20T00:00:00Z',
      }
    } as Session;
  }

  async register(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
    logger.log('register (mocked)', email, password)
    return {
      user: {
        id: 'mock-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'mock@example.com',
        email_confirmed_at: '2023-10-20T00:00:00Z',
        phone_confirmed_at: '2023-10-20T00:00:00Z',
        last_sign_in_at: '2023-10-20T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: [],
        created_at: '2023-10-20T00:00:00Z',
        updated_at: '2023-10-20T00:00:00Z',
      },
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 1000,
        token_type: 'Bearer',
        user: {
          id: 'mock-user-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'mock@example.com',
        }
      } as unknown as Session,
    }
  }

  async loginWithGoogle(): Promise<void> {
    logger.log('loginWithGoogle (mocked)')
    // Simulate successful Google login by returning a mock user/session
    const mockUser = {
      id: 'mock-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'mock@example.com',
      email_confirmed_at: '2023-10-20T00:00:00Z',
      phone_confirmed_at: '2023-10-20T00:00:00Z',
      last_sign_in_at: '2023-10-20T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
      identities: [],
      factors: [],
      created_at: '2023-10-20T00:00:00Z',
      updated_at: '2023-10-20T00:00:00Z',
    } as User;
    
    const mockSession = {
      access_token: 'mock-google-access-token',
      refresh_token: 'mock-google-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      user: mockUser
    } as Session;
    
    // Use the same callback mechanism as the onAuthStateChange to set the user
    Promise.resolve().then(() => {
      if (this.authStateCallback) {
        this.authStateCallback('SIGNED_IN', mockSession);
      }
    });
    
    return;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void> | void) {
    this.authStateCallback = callback;
    
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 1000,
      token_type: 'Bearer',
      user: {
        id: 'mock-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'mock@example.com',
        email_confirmed_at: '2023-10-20T00:00:00Z',
        phone_confirmed_at: '2023-10-20T00:00:00Z',
        last_sign_in_at: '2023-10-20T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: [],
        created_at: '2023-10-20T00:00:00Z',
        updated_at: '2023-10-20T00:00:00Z',
      }
    } as Session;

    // Simulate immediate 'SIGNED_IN' event with mock session
    Promise.resolve().then(() => {
      callback('SIGNED_IN', mockSession);
    });

    // Return a mock subscription object with an unsubscribe method, wrapped in 'data'
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            console.log('Mock auth state subscription unsubscribed');
          }
        } as Subscription
      }
    };
  }
} 