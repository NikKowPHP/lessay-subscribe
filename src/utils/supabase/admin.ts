// src/utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'
import logger from '../logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  logger.error('Supabase URL or Service Role Key is missing for Admin Client.')
  // Throw an error during initialization if keys are missing server-side
  // This prevents the application from starting in an invalid state.
  throw new Error('Supabase Admin Client cannot be initialized: Missing URL or Service Role Key.')
}

// Create a singleton instance of the Supabase client for admin tasks
// This is safe because the service role key doesn't depend on user sessions/cookies
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
   // Add global fetch options for timeout if needed, especially for serverless
   global: {
    fetch: (input, init) => {
      return fetch(input, {
        ...init,
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });
    },
  },
})

logger.info('Supabase Admin client initialized successfully.')

export default supabaseAdmin