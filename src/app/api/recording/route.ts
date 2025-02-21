// 'use server'
import { NextRequest, NextResponse } from 'next/server';
import RecordingService from '@/services/recordingService';
import logger from '@/utils/logger';
import { mockResponse } from '@/models/aiResponse.model';
import { IncomingForm } from 'formidable';
import { readFile } from 'fs/promises';
import { IncomingMessage } from 'http';

const API_KEY = process.env.AI_API_KEY;
// Set maximum allowed payload size to 50MB
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const config = {
  api: {
    bodyParser: false, // Disable default body parsing
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req as unknown as IncomingMessage, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const audioFile = formData.files.audio?.[0];
    const recordingTime = formData.fields.recordingTime?.[0];
    const recordingSize = formData.fields.recordingSize?.[0];

    if (!audioFile || !recordingTime || !recordingSize) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const userIP =
      req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';

    // logger.log('User IP:', userIP);

    if (!API_KEY) {
      return NextResponse.json(
        { message: "API KEY IS NOT PROVIDED" },
        { status: 500 }
      ); 
    }

    // Read file buffer
    const audioBuffer = await readFile(audioFile.filepath);
    
    const recordingService = new RecordingService(API_KEY);
    const fileUri = await recordingService.uploadFile(
      audioBuffer,
      audioFile.mimetype || 'audio/aac-adts',
      audioFile.originalFilename || 'recording.aac'
    );
    logger.log("File URI:", fileUri);

    let aiResponse;
    if (process.env.MOCK_AI_RESPONSE === 'true') {
      aiResponse = mockResponse;
    } else {
      aiResponse = await recordingService.submitRecording(
        userIP,
        fileUri,  // Now using file URI instead of base64
        Number(recordingTime),
        Number(recordingSize)
      );
    }
    logger.log("AI Response:", aiResponse);

    return NextResponse.json(
      { message: "Recording data received successfully", aiResponse },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error("Subscription error:", errorMessage);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}