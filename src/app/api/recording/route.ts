'use server'
import { NextRequest, NextResponse } from 'next/server';
import RecordingService from '@/services/recordingService';

const API_KEY = process.env.AI_API_KEY;

export async function POST(req: NextRequest) {
  const userIP = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
  const data = await req.json();

  console.log('Received data:', data);
  console.log('User IP:', userIP);

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
    const aiResponse = await recordingService.submitRecording(userIP, audioData, recordingTime, recordingSize);
    console.log("AI Response:", aiResponse);

    return NextResponse.json(
      { message: "Recording data received successfully", aiResponse },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}