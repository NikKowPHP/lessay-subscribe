import { ITTS } from "@/interfaces/tts.interface";

export const mockTtsEngine: ITTS = {
  synthesizeSpeech: async (text: string, language: string, voice: string) => {
    console.warn('Replace this with actual TTS engine implementation');
    return Buffer.from(`Generated audio for: ${text} (${language}, ${voice})`);
  }
};