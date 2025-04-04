import { IAuthService } from '@/services/auth.service'
import { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js'
import logger from '@/utils/logger'
export class MockAuthService implements IAuthService {
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

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => Promise<void> | void) {
    // Mock implementation for onAuthStateChange - always logged in

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