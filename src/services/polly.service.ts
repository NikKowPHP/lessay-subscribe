import {
  Engine, 
  OutputFormat, 
  TextType,
  VoiceId,
  LanguageCode,
  PollyClient,
  SynthesizeSpeechCommand
} from "@aws-sdk/client-polly";
import { Readable } from 'stream';
import logger from '@/utils/logger';
import { ITTS } from '@/interfaces/tts.interface';

export class PollyService implements ITTS {
  private pollyClient: PollyClient;

  constructor() {
    this.validateEnvironment();
    this.pollyClient = new PollyClient({
      region: process.env.AWS_POLLY_REGION,
      credentials: {
        accessKeyId: process.env.AWS_POLLY_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_POLLY_SECRET_KEY!
      }
    });
  }

  public async synthesizeSpeech(text: string, language: string, voice: string): Promise<Buffer> {
    try {
      const params = this.createSynthesisParams(text, language, voice);
      const command = new SynthesizeSpeechCommand(params);
      const response = await this.pollyClient.send(command);
      
      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }

      return await this.streamToBuffer(response.AudioStream as Readable);
    } catch (error) {
      logger.error('Polly synthesis error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  private createSynthesisParams(text: string, language: string, voice: string) {
    return {
      Text: text,
      LanguageCode: language as LanguageCode, // Cast to enum type
      VoiceId: voice as VoiceId, // Cast to enum type
      OutputFormat: OutputFormat.MP3,
      Engine: Engine.NEURAL,
      TextType: TextType.SSML
    };
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private validateEnvironment(): void {
    const requiredVars = [
      'AWS_POLLY_ACCESS_KEY',
      'AWS_POLLY_SECRET_KEY',
      'AWS_POLLY_REGION'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
}