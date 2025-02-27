
export class TTS {

  constructor() {
    this.polly = new PollyService();
  }

  async fetchPollyAudio(ipa: string, language: string, voice: string) {
    return await fetchPollyAudio(ipa, language);
  }
  private getConfig(language: string, voice: string) {

    AWS.config.update({
    accessKeyId: process.env.AWS_POLLY_ACCESS_KEY,
    secretAccessKey: process.env.AWS_POLLY_SECRET_KEY,
    region: process.env.AWS_POLLY_REGION
  });
    return {
      languageCode: language,
      voiceId: voice
    }
  }


}
