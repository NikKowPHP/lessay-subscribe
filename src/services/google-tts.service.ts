import { ITTS } from '@/interfaces/tts.interface';
import logger from '@/utils/logger';
import axios from 'axios';

export class GoogleTTS implements ITTS {
  
  constructor() {
    this.validateEnvironment();
  }

  public async synthesizeSpeech(text: string, language: string, voice: string): Promise<Buffer> {
    try {
      // Get Google Cloud authentication token
      const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
      logger.info(`Access token: ${accessToken}`);
      // Prepare request data for Google TTS API
      const requestData = {
        input: {
          text: text
        },
        voice: {
          languageCode: language,
          name: voice
        },
        audioConfig: {
          audioEncoding: 'MP3'
        }
      };

      // Make request to Google TTS API
      const response = await axios({
        method: 'post',
        url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-User-Project': process.env.GOOGLE_CLOUD_PROJECT!,
          'Authorization': `Bearer ${accessToken}`
        },
        data: requestData
      });
      
      // Google TTS returns base64-encoded audio content
      if (!response.data.audioContent) {
        throw new Error('No audio content received from Google TTS');
      }
      
      // Convert base64 to buffer
      return Buffer.from(response.data.audioContent, 'base64');
    } catch (error) {
      logger.error('Google TTS synthesis error:', error);
      throw new Error('Failed to synthesize speech with Google TTS');
    }
  }

  // private async getGoogleAccessToken(): Promise<string> {
  //   try {
  //     const execPromise = promisify(exec);
  //     const { stdout } = await execPromise('gcloud auth print-access-token');
  //     return stdout.trim();
  //   } catch (error) {
  //     logger.error('Failed to get Google access token:', error);
  //     throw new Error('Authentication failed with Google Cloud');
  //   }
  // }

  private validateEnvironment(): void {
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT',
      'GOOGLE_CLOUD_ACCESS_TOKEN'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
}