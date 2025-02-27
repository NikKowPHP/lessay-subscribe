import logger from '@/utils/logger';
import AWS from 'aws-sdk';
export class PollyService {
  private polly: AWS.Polly;

  constructor() {
    this.setPollyConfig();
  }
  public generateAudio(text: string, language: string, voice: string) {
    return this.polly.synthesizeSpeech(this.defineAudioConfig(text, language, voice), (err: AWS.Polly.PollyError, data: AWS.Polly.SynthesizeSpeechOutput) => {
      if (err) logger.log(err);
      else logger.log(data);
    });
  }
  private setPollyConfig() {
    this.checkEnviroment();
    this.setPollyEnviroment();
  }

  private defineAudioConfig(text: string, language: string, voice: string) {
    return {
      Text: text,
      LanguageCode: language,
      VoiceId: voice,
      OutputFormat: 'mp3',
      Engine: 'neural'
    }
  }

  private setPollyEnviroment() {
    AWS.config.update({
      accessKeyId: process.env.AWS_POLLY_ACCESS_KEY,
      secretAccessKey: process.env.AWS_POLLY_SECRET_KEY,
      region: process.env.AWS_POLLY_REGION
    });
    this.polly = new AWS.Polly();
  }

  private checkEnviroment() {

    if (!process.env.AWS_POLLY_ACCESS_KEY || !process.env.AWS_POLLY_SECRET_KEY || !process.env.AWS_POLLY_REGION) {
      throw new Error('AWS_POLLY_ACCESS_KEY, AWS_POLLY_SECRET_KEY, and AWS_POLLY_REGION must be set');
    }
  }
}