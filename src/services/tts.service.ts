import { ITTS } from "@/interfaces/tts.interface";
import { getTtsVoiceId } from "@/utils/polly-voice.mapper.utli";

export class TTS {

  private ttsEngine: ITTS;
  constructor(ttsEngine: ITTS) {
    this.ttsEngine = ttsEngine;
  }

  public async generateAudio(text: string, language: string) {
    const voice = this.voiceToUse(language);
    return await this.ttsEngine.synthesizeSpeech(text, language, voice);
  }

  private voiceToUse(language: string) {
    return getTtsVoiceId(language);
  }
}
