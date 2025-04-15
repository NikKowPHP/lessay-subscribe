import { put } from '@vercel/blob';
import logger from '@/utils/logger';

export const uploadFile = async (file: Buffer, filename: string, contentType: string): Promise<string> => {
  try {
    const blob = await put(filename, file, {
      access: 'public',
      contentType,
    });
    logger.log(`File uploaded successfully: ${blob.url}`);
    return blob.url;
  } catch (error) {
    logger.error('Error uploading file:', error);
    throw error;
  }
};