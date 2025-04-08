import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';

// In-memory store for mock sessions
let mockSessionStore: any = null;

export async function POST(req: NextRequest) {
  try {
    const { action, email, password } = await req.json();

    logger.info('POST IN mock auth route', action, email, password);

    switch (action) {
      case 'login':
        const loginSession = {
          access_token: `mock-access-token-${Date.now()}`,
          refresh_token: `mock-refresh-token-${Date.now()}`,
          expires_in: 3600,
          token_type: 'Bearer',
          user: {
            id: 'mock-user-id',
            email: email,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            factors: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            phone_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          }
        };
        mockSessionStore = loginSession;
        return NextResponse.json({ user: loginSession.user, session: loginSession });

      case 'register':
        const registerSession = {
          access_token: `mock-reg-access-token-${Date.now()}`,
          refresh_token: `mock-reg-refresh-token-${Date.now()}`,
          expires_in: 3600,
          token_type: 'Bearer',
          user: {
            id: 'mock-user-id',
            email: email,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            factors: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            phone_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          }
        };
        mockSessionStore = registerSession;
        return NextResponse.json({ user: registerSession.user, session: registerSession });

      case 'logout':
        mockSessionStore = null;
        return NextResponse.json({ success: true });

      case 'getSession':
        return NextResponse.json({ session: mockSessionStore });

      case 'googleLogin':
        const googleSession = {
          access_token: `mock-google-access-token-${Date.now()}`,
          refresh_token: `mock-google-refresh-token-${Date.now()}`,
          expires_in: 3600,
          token_type: 'Bearer',
          user: {
            id: 'mock-google-user-id',
            email: 'mock.google@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'google' },
            user_metadata: {},
            identities: [],
            factors: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            phone_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          }
        };
        mockSessionStore = googleSession;
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Mock auth error:", errorMessage);
    return NextResponse.json(
      { message: "Mock auth failed", error: errorMessage },
      { status: 500 }
    );
  }
}
