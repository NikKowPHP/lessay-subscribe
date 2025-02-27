import logger from '@/utils/logger';
import AWS from 'aws-sdk';
import { ITTS } from '@/interfaces/tts.interface';
export class PollyService implements ITTS {
  private polly!: AWS.Polly;

  constructor() {
    this.initializePolly();
  }
  public async synthesizeSpeech(text: string, language: string, voice: string): Promise<Buffer> {
    try {
      const params = this.createSynthesisParams(text, language, voice);
      const response = await this.polly.synthesizeSpeech(params).promise();
      
      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }
      
      return Buffer.from(response.AudioStream as Uint8Array);
    } catch (error) {
      logger.error('Polly synthesis error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }
  private initializePolly(): void {
    this.validateEnvironment();
    this.configureAWS();
    this.polly = new AWS.Polly();
  }

  private createSynthesisParams(text: string, language: string, voice: string): AWS.Polly.SynthesizeSpeechInput {
    return {
      Text: text,
      LanguageCode: language,
      VoiceId: voice,
      OutputFormat: 'mp3',
      Engine: 'neural',
      TextType: 'text'
    };
  }


  private configureAWS(): void {
    AWS.config.update({
      accessKeyId: process.env.AWS_POLLY_ACCESS_KEY,
      secretAccessKey: process.env.AWS_POLLY_SECRET_KEY,
      region: process.env.AWS_POLLY_REGION
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