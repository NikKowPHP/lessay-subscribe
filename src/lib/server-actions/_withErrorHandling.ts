// src/lib/server-actions/_withErrorHandling.ts
import logger from '@/utils/logger'

export type Result<T> = { data?: T; error?: string }

export async function withServerErrorHandling<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await fn()
    return { data }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('ServerAction error:', message)
    return { error: message }
  }
}