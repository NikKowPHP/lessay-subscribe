// 'use server'
import { NextRequest, NextResponse } from 'next/server';
import RecordingService from '@/services/recording.service';
import logger from '@/utils/logger';
import { mockDetailedResponse, mockResponse } from '@/models/AiResponse.model';
import formidable, { IncomingForm, Fields, File } from 'formidable';
import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { IncomingMessage } from 'http';
import { ITTS } from '@/interfaces/tts.interface';
import { TTS } from '@/services/tts.service';

const mockTtsEngine: ITTS = {
  synthesizeSpeech: async (text: string, language: string, voice: string) => {
    console.warn('Replace this with actual TTS engine implementation');
    return Buffer.from(`Generated audio for: ${text} (${language}, ${voice})`);
  }
};


export async function POST(req: NextRequest) {
  try {
    const { text, language, voice } = await req.json();

    if (!text || !language || !voice) {
      return NextResponse.json(
        { message: "Missing required fields: text, language, or voice" },
        { status: 400 }
      );
    }

    const ttsService = new TTS(mockTtsEngine);
    const audioBuffer = await ttsService.generateAudio(text, language, voice);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString()
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error("Phoneme generation error:", errorMessage);
    return NextResponse.json(
      { message: "Phoneme generation failed", error: errorMessage },
      { status: 500 }
    );
  }

}