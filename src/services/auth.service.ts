import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const verifyJwt = async (token: string): Promise<any> => {
  try {
    const secret = new TextEncoder().encode(supabaseServiceRoleKey);
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: 'supabase',
      audience: 'authenticated',
    });

    return payload;
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return null;
  }
};
