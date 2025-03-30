
export interface ITTS {
  synthesizeSpeech(text: string, language: string, voice: string): Promise<string>;
  getVoice(language: string): string;
}