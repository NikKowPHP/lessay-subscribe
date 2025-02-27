// 'use server'
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { ITTS } from '@/interfaces/tts.interface';
import { TTS } from '@/services/tts.service';
import { PollyService } from '@/services/polly.service';

const mockTtsEngine: ITTS = {
  synthesizeSpeech: async (text: string, language: string, voice: string) => {
    console.warn('Replace this with actual TTS engine implementation');
    return Buffer.from(`Generated audio for: ${text} (${language}, ${voice})`);
  }
};


export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json();

    if (!text || !language) {
      return NextResponse.json(
        { message: "Missing required fields: text, language, or voice" },
        { status: 400 }
      );
    }

    const ttsService = new TTS(new PollyService());
    const audioBuffer = await ttsService.generateAudio(text, language);
    console.log('audioBuffer', audioBuffer.length.toString());

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