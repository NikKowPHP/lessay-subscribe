import { ITTS } from '@/interfaces/tts.interface';
import logger from '@/utils/logger';
import axios from 'axios';

export class GoogleTTS implements ITTS {
  
  constructor() {
    this.validateEnvironment();
  }

  public async synthesizeSpeech(text: string, language: string, voice: string): Promise<string> {
    try {
      // Get Google Cloud authentication token
      const accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
      logger.info(`Access token: ${accessToken}`);
      
      // Map full language name to language code if needed
      const languageCode = this.mapLanguageToCode(language);
      
      // Prepare request data for Google TTS API
      const requestData = {
        input: {
          text: text
        },
        voice: {
          languageCode: languageCode,
          name: voice
        },
        audioConfig: {
          audioEncoding: 'MP3'
        }
      };

      logger.info('requestData for google tts', requestData);

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

      logger.info('response.data.audioContent', response.data.audioContent);
      
      // Return the base64 string directly
      return response.data.audioContent;
    } catch (error) {
      logger.error('Google TTS synthesis error:', error);
      throw new Error('Failed to synthesize speech with Google TTS');
    }
  }

  // Helper method to map full language names to BCP-47 language codes
  private mapLanguageToCode(language: string): string {
    const languageMap: Record<string, string> = {
      'english': 'en-US',
      'english (us)': 'en-US',
      'english (uk)': 'en-GB',
      'english (australia)': 'en-AU',
      'english (india)': 'en-IN',
      'german': 'de-DE',
      'french': 'fr-FR',
      'spanish': 'es-ES',
      'italian': 'it-IT',
      'portuguese': 'pt-PT',
      'portuguese (brazil)': 'pt-BR',
      'dutch': 'nl-NL',
      'polish': 'pl-PL',
      'swedish': 'sv-SE',
      'danish': 'da-DK',
      'norwegian': 'nb-NO',
      'finnish': 'fi-FI',
      'czech': 'cs-CZ',
      'slovak': 'sk-SK',
      'hungarian': 'hu-HU',
      'romanian': 'ro-RO',
      'greek': 'el-GR',
      'japanese': 'ja-JP',
      'korean': 'ko-KR',
      'chinese': 'cmn-CN',
      'chinese (mandarin)': 'cmn-CN',
      'chinese (cantonese)': 'yue-HK',
      'vietnamese': 'vi-VN',
      'thai': 'th-TH',
      'indonesian': 'id-ID',
      'malay': 'ms-MY',
      'hindi': 'hi-IN',
      'tamil': 'ta-IN',
      'bengali': 'bn-IN',
      'arabic': 'ar-XA',
      'turkish': 'tr-TR',
      'hebrew': 'he-IL',
      'persian': 'fa-IR',
      'russian': 'ru-RU',
      'ukrainian': 'uk-UA',
      'filipino': 'fil-PH',
      'swahili': 'sw-KE'
    };
    
    // Normalize and look up language code
    const normalizedLanguage = language.toLowerCase().trim();
    
    // Direct match
    if (normalizedLanguage in languageMap) {
      return languageMap[normalizedLanguage];
    }
    
    // Partial match
    for (const [key, code] of Object.entries(languageMap)) {
      if (normalizedLanguage.includes(key) || key.includes(normalizedLanguage)) {
        return code;
      }
    }
    
    // Default fallback
    logger.warn(`No language code mapping found for: ${language}, using en-US as default`);
    return 'en-US';
  }

  public getVoice(language: string): string {
    logger.info(`Getting voice for language: ${language}`);
    
    // Normalize language name
    const normalizedLanguage = language.toLowerCase().trim();
    
    // Map of languages to their best available Google TTS voices
    // Prioritizing Neural2 > Studio > WaveNet > Standard voices
    const languageVoiceMap: Record<string, string> = {
      // English variants
      'english': 'en-US-Neural2-F', // Female Neural2 voice
      'english (us)': 'en-US-Neural2-F',
      'english (uk)': 'en-GB-Neural2-B', // British English
      'english (australia)': 'en-AU-Neural2-B',
      'english (india)': 'en-IN-Neural2-A',
      
      // European languages
      'german': 'de-DE-Neural2-B',
      'french': 'fr-FR-Neural2-A',
      'spanish': 'es-ES-Neural2-F',
      'italian': 'it-IT-Neural2-A',
      'portuguese': 'pt-PT-Neural2-A',
      'portuguese (brazil)': 'pt-BR-Neural2-A',
      'dutch': 'nl-NL-Wavenet-B',
      'polish': 'pl-PL-Wavenet-A',
      'swedish': 'sv-SE-Wavenet-A',
      'danish': 'da-DK-Wavenet-A',
      'norwegian': 'nb-NO-Wavenet-E',
      'finnish': 'fi-FI-Wavenet-A',
      'czech': 'cs-CZ-Wavenet-A',
      'slovak': 'sk-SK-Wavenet-A',
      'hungarian': 'hu-HU-Wavenet-A',
      'romanian': 'ro-RO-Wavenet-A',
      'greek': 'el-GR-Wavenet-A',
      
      // Asian languages
      'japanese': 'ja-JP-Neural2-B',
      'korean': 'ko-KR-Neural2-A',
      'chinese': 'cmn-CN-Wavenet-A', // Mandarin
      'chinese (mandarin)': 'cmn-CN-Wavenet-A',
      'chinese (cantonese)': 'yue-HK-Standard-A',
      'vietnamese': 'vi-VN-Neural2-A',
      'thai': 'th-TH-Neural2-C',
      'indonesian': 'id-ID-Wavenet-A',
      'malay': 'ms-MY-Wavenet-A',
      'hindi': 'hi-IN-Neural2-A',
      'tamil': 'ta-IN-Wavenet-A',
      'bengali': 'bn-IN-Wavenet-A',
      
      // Middle Eastern languages
      'arabic': 'ar-XA-Wavenet-B',
      'turkish': 'tr-TR-Wavenet-A',
      'hebrew': 'he-IL-Wavenet-A',
      'persian': 'fa-IR-Wavenet-A',
      
      // Other languages
      'russian': 'ru-RU-Wavenet-D',
      'ukrainian': 'uk-UA-Wavenet-A',
      'filipino': 'fil-PH-Wavenet-A',
      'swahili': 'sw-KE-Standard-A'
    };
    
    // Try to find a direct match
    if (normalizedLanguage in languageVoiceMap) {
      return languageVoiceMap[normalizedLanguage];
    }
    
    // Try to find a partial match by checking if the normalized language
    // contains any of our supported language keys
    for (const [key, voice] of Object.entries(languageVoiceMap)) {
      if (normalizedLanguage.includes(key) || key.includes(normalizedLanguage)) {
        return voice;
      }
    }
    
    // Default fallback voice if no match found
    logger.warn(`No voice found for language: ${language}, using default English voice`);
    return 'en-US-Neural2-F';
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