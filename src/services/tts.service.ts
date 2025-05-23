import { ITTS } from "@/interfaces/tts.interface";
import { getTtsVoiceId } from "@/utils/polly-voice.mapper.utli";

export class TTS {

  private ttsEngine: ITTS;
  constructor(ttsEngine: ITTS) {
    this.ttsEngine = ttsEngine;
  }

  public async synthesizeSpeech(text: string, language: string, voice: string): Promise<string> {
    return await this.ttsEngine.synthesizeSpeech(text, language, voice);
  }

  public getVoice(language: string, quality: 'basic' | 'hd'): string {
    return getTtsVoiceId(language);
  }
}
