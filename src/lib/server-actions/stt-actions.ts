'use server';

import { createSupabaseServerClient } from '@/utils/supabase/server'; // Import the server client creator
import logger from '@/utils/logger'; // Import logger
import { GoogleSttService, SttRequestConfig } from '@/services/stt.service';

const sttService = new GoogleSttService();

interface TranscribeResult {
  transcript?: string;
  error?: string;
}

export async function transcribeAudio(formData: FormData): Promise<TranscribeResult> {
  try {
    // 1. Get Supabase client and validate user session
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('STT Action: Error getting session:', sessionError);
      return { error: 'Failed to retrieve session' };
    }

    if (!session?.user?.id) {
      console.error('STT Action: Unauthorized access attempt.');
      return { error: 'Unauthorized' };
    }
    const userId = session.user.id;

    // 2. Parse FormData
    const audioBlob = formData.get('audio') as Blob | null;
    const languageCode = formData.get('languageCode') as string | null; // e.g., 'en-US'
    const sampleRateHertzStr = formData.get('sampleRateHertz') as string | null; // e.g., '48000'
    const encodingStr = formData.get('encoding') as string | null; // e.g., 'WEBM_OPUS', 'LINEAR16'

    if (!audioBlob || !languageCode || !sampleRateHertzStr || !encodingStr) {
      console.error('STT Action: Missing required form data.', { audioBlob: !!audioBlob, languageCode, sampleRateHertzStr, encodingStr });
      return { error: 'Missing required form data: audio, languageCode, sampleRateHertz, encoding' };
    }

    const sampleRateHertz = parseInt(sampleRateHertzStr, 10);
    if (isNaN(sampleRateHertz)) {
        console.error('STT Action: Invalid sampleRateHertz.', { sampleRateHertzStr });
        return { error: 'Invalid sampleRateHertz' };
    }

    // Validate encoding against allowed types
    const allowedEncodings = ['WEBM_OPUS', 'LINEAR16'];
    if (!allowedEncodings.includes(encodingStr)) {
        console.error('STT Action: Invalid encoding.', { encodingStr });
        return { error: `Invalid encoding: ${encodingStr}. Allowed types: ${allowedEncodings.join(', ')}` };
    }

    // 3. Convert Blob to Buffer/Base64 for Google API
    const audioBytes = await audioBlob.arrayBuffer();
    const audioBuffer = Buffer.from(audioBytes);

    const sttRequestConfig: SttRequestConfig = {
      audioBytes: audioBuffer,
      encoding: encodingStr, // As validated earlier
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    };

    try {
      console.log(`STT Action: Sending request to GoogleSttService for user ${userId}, lang: ${languageCode}, rate: ${sampleRateHertz}, encoding: ${encodingStr}, size: ${audioBlob.size}`);
      const sttResponse = await sttService.transcribe(sttRequestConfig);

      if (!sttResponse.transcript) {
        console.warn('STT Action: GoogleSttService returned no transcription.');
        return { transcript: '' };
      }

      console.log(`STT Action: Successfully transcribed audio for user ${userId}. Transcript: "${sttResponse.transcript}"`);
      return { transcript: sttResponse.transcript };

    } catch (error) {
      console.error('STT Action: Error calling GoogleSttService:', error);
      return { error: `STT service error: ${error instanceof Error ? error.message : String(error)}` };
    }

  } catch (error) {
    console.error('STT Action: Error processing request:', error);
    if (error instanceof Error) {
      return { error: `Internal Server Error: ${error.message}` };
    }
    return { error: 'Internal Server Error' };
  }
}
