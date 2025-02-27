import { ITTS } from "@/interfaces/tts.interface";

export class TTS {

  private ttsEngine: ITTS;
  constructor(ttsEngine: ITTS) {
    this.ttsEngine = ttsEngine;
  }

  public async generateAudio(text: string, language: string, voice: string) {
    return await this.ttsEngine.synthesizeSpeech(text, language, voice);
  }
}