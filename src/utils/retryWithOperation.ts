
import logger from '@/utils/logger';
export const retryOperation = async <T>(operation: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {

          // If it's a 429 error, propagate immediately.
      if ((error as any)?.response?.data?.error?.code === 429) {
        throw error;
      }
        
        lastError = error;
        logger.error(`RecordingService operation failed, attempt ${attempt + 1} of ${attempts}.`, error);
        if (attempt < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }