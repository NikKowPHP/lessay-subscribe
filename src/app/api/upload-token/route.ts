import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import logger from '@/utils/logger';

export async function POST(request: Request) {
  // You could add auth checking here to ensure only authorized users can upload
  try {
    // Parse the incoming request as JSON
    const body = await request.json() as HandleUploadBody;
    
    // Use handleUpload to generate the token and handle everything
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        logger.log('onBeforeGenerateToken', pathname, clientPayload);
        
        // This determines the allowed file types and sizes
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'application/pdf'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB file size limit
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This callback only works when deployed (not on localhost)
        logger.log('Upload completed:', blob, tokenPayload);
      },
    });
    logger.log('jsonResponse in upload-token', jsonResponse)
    return NextResponse.json(jsonResponse);
  } catch (error) {
    logger.log('Error generating upload token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}