'use server'
import { NextRequest, NextResponse } from 'next/server';
import RecordingService from '@/services/recordingService';
import logger from '@/utils/logger';
import { mockResponse } from '@/models/aiResponse.model';

const API_KEY = process.env.AI_API_KEY;

export async function POST(req: NextRequest) {
  const userIP = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
  const data = await req.json();

  logger.log('Received data:', data);
  logger.log('User IP:', userIP);

  try {
    const { audioData, recordingTime, recordingSize } = data;

    if (!audioData || !recordingTime || !recordingSize) {
      return NextResponse.json(
        { message: "Missing audioData or recordingTime" },
        { status: 400 }
      );
    }
    if (!API_KEY) {
      return NextResponse.json(
        { message: "API KEY IS NOT PROVIDED" },
        { status: 500 }
      ); 
    }
    const recordingService = new RecordingService(API_KEY); 
    let aiResponse;
  
    if (process.env.MOCK_AI_RESPONSE === 'true') {
      aiResponse = mockResponse
    } else {
       aiResponse = await recordingService.submitRecording(userIP, audioData, recordingTime, recordingSize);
    }
    logger.log("AI Response:", aiResponse);

    return NextResponse.json(
      { message: "Recording data received successfully", aiResponse },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error("Subscription error:", errorMessage);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}