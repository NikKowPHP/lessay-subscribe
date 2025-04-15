import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import logger from '../logger'

export async function createSupabaseServerClient(request?: NextRequest) {
  try {
    if (request) {
      // Middleware usage
      return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
          }
        },
         // Add global fetch options for timeout
         global: {
          fetch: (input, init) => {
            return fetch(input, {
              ...init,
              // Increase timeout to 30 seconds for proxy environments
              signal: AbortSignal.timeout(30000)
            })
          }
        }
      }
    )
  }

  // Server Component usage - now with await
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        }
      },
      // Add global fetch options for timeout
      global: {
        fetch: (input, init) => {
          return fetch(input, {
            ...init,
            // Increase timeout to 30 seconds for proxy environments
            signal: AbortSignal.timeout(30000)
          })
        }
      }
    }
  )
  } catch (error) {
    logger.error('Error in createSupabaseServerClient:', { error: (error as Error).message });
    throw error;
  }
}
