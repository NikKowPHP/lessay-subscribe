// 'use server'
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyJwt } from '@/services/auth.service';
import { TTS } from '@/services/tts.service';
import { PollyService } from '@/services/polly.service';

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authorization.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyJwt(token);
  if (!payload || !payload.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = payload.sub;

  try {
    const { text, language } = await req.json();

    if (!text || !language) {
      return NextResponse.json(
        { message: "Missing required fields: text, language" },
        { status: 400 }
      );
    }
 
    const ttsService = new TTS(new PollyService());
    const voice = ttsService.getVoice(language, 'hd');
    const audioBuffer = await ttsService.synthesizeSpeech(text, language, voice);
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