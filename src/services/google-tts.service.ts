import { ITTS } from '@/interfaces/tts.interface';
import logger from '@/utils/logger';
import axios from 'axios';
import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';

export class GoogleTTS implements ITTS {
  private auth: GoogleAuth;

  private googleProjectId: string;

  constructor() {
    this.validateEnvironment(); // Checks required vars like GOOGLE_CLOUD_PROJECT
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
    this.googleProjectId = projectId;

    const authOptions: GoogleAuthOptions = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
     
    };

    // Check if running in an environment with Base64 credentials
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      // Declare variable here to make it accessible in the catch block
      let decodedCredentials = '';
      try {
        logger.info(
          'Found GOOGLE_CREDENTIALS_BASE64, decoding and using for Google Auth.'
        );
        // Perform decoding
        decodedCredentials = Buffer.from(
          process.env.GOOGLE_CREDENTIALS_BASE64,
          'base64'
        ).toString('utf-8');

        // Attempt to parse the decoded string
        const credentials = JSON.parse(decodedCredentials);
        authOptions.credentials = credentials; // Pass credentials object directly

        // Ensure the project ID from the credentials matches, or override if necessary
        if (
          credentials.project_id &&
          credentials.project_id !== this.googleProjectId
        ) {
          logger.warn(
            `Project ID mismatch: GOOGLE_CLOUD_PROJECT is ${this.googleProjectId}, but credentials file has ${credentials.project_id}. Using ID from credentials.`
          );
          // Use the project ID from the credentials file as it's more specific
          this.googleProjectId = credentials.project_id;
        }
        // If parsing and checks succeed, we're good for this branch
      } catch (error) {
        // Log the failure reason AND the problematic input string (partially)
        logger.error(
          'Failed to decode/parse GOOGLE_CREDENTIALS_BASE64. Input string causing error (first 100 chars):',
          // Check if decodedCredentials has content before trying to access it
          decodedCredentials
            ? decodedCredentials.substring(0, 100) + '...'
            : 'Input string was empty or not captured.'
        );
        logger.error(
          'Underlying Error:', // Log the actual error (e.g., SyntaxError)
          error
        );

        // Throw a new error to indicate initialization failure from Base64
        throw new Error(
          'Failed to initialize Google Auth from Base64 credentials. Check Base64 encoding and JSON validity.'
        );
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // If not using Base64, log the use of the file path.
      // GoogleAuth library will automatically pick up this env variable if authOptions.credentials is not set.
      logger.info(
        `Using GOOGLE_APPLICATION_CREDENTIALS file path for Google Auth: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
      );
     
    } else {
      // If neither variable is set, GoogleAuth will try Application Default Credentials (ADC)
      logger.warn(
        'Neither GOOGLE_CREDENTIALS_BASE64 nor GOOGLE_APPLICATION_CREDENTIALS is set. Attempting Application Default Credentials (ADC).'
      );
    }

    
    try {
      this.auth = new GoogleAuth(authOptions);
    } catch (authError) {
      logger.error('Failed to initialize GoogleAuth instance:', authError);
      throw new Error(
        `Google Auth initialization failed: ${authError instanceof Error ? authError.message : String(authError)}`
      );
    }

    if (!this.googleProjectId) {
      logger.error(
        'Google Project ID could not be determined after auth setup.'
      );
      throw new Error(
        "Google Project ID is missing. Set GOOGLE_CLOUD_PROJECT or ensure credentials file contains 'project_id'."
      );
    } else {
      logger.info(
        `GoogleTTS service initialized for project: ${this.googleProjectId}`
      );
    }
  } // End of constructor

  public async synthesizeSpeech(
    text: string,
    language: string,
    voice: string
  ): Promise<string> {
    try {
      // Get auth client and token
      const client = await this.auth.getClient();
      const token = await client.getAccessToken();
      const accessToken = token.token;

      // Map full language name to language code if needed
      const languageCode = this.mapLanguageToCode(language);

      // Prepare request data for Google TTS API
      const requestData = {
        input: {
          text: text,
        },
        voice: {
          languageCode: languageCode,
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
        },
      };

      logger.info('requestData for google tts', requestData);

      // Make request to Google TTS API
      const response = await axios({
        method: 'post',
        url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
        headers: {
          'Content-Type': 'application/json',
          // Use the stored project ID
          'X-Goog-User-Project': this.googleProjectId,
          Authorization: `Bearer ${accessToken}`,
        },
        data: requestData,
        responseType: 'json', // Ensure response is parsed as JSON
      });

      if (!response.data || !response.data.audioContent) {
        // Check response.data exists
        logger.error('Invalid response from Google TTS API:', response.data);
        throw new Error('No audio content received from Google TTS');
      }

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
      english: 'en-US',
      'english (us)': 'en-US',
      'english (uk)': 'en-GB',
      'english (australia)': 'en-AU',
      'english (india)': 'en-IN',
      german: 'de-DE',
      french: 'fr-FR',
      spanish: 'es-ES',
      italian: 'it-IT',
      portuguese: 'pt-PT',
      'portuguese (brazil)': 'pt-BR',
      dutch: 'nl-NL',
      polish: 'pl-PL',
      swedish: 'sv-SE',
      danish: 'da-DK',
      norwegian: 'nb-NO',
      finnish: 'fi-FI',
      czech: 'cs-CZ',
      slovak: 'sk-SK',
      hungarian: 'hu-HU',
      romanian: 'ro-RO',
      greek: 'el-GR',
      japanese: 'ja-JP',
      korean: 'ko-KR',
      chinese: 'cmn-CN',
      'chinese (mandarin)': 'cmn-CN',
      'chinese (cantonese)': 'yue-HK',
      vietnamese: 'vi-VN',
      thai: 'th-TH',
      indonesian: 'id-ID',
      malay: 'ms-MY',
      hindi: 'hi-IN',
      tamil: 'ta-IN',
      bengali: 'bn-IN',
      arabic: 'ar-XA',
      turkish: 'tr-TR',
      hebrew: 'he-IL',
      persian: 'fa-IR',
      russian: 'ru-RU',
      ukrainian: 'uk-UA',
      filipino: 'fil-PH',
      swahili: 'sw-KE',
    };

    // Normalize and look up language code
    const normalizedLanguage = language.toLowerCase().trim();

    // Direct match
    if (normalizedLanguage in languageMap) {
      return languageMap[normalizedLanguage];
    }

    // Partial match
    for (const [key, code] of Object.entries(languageMap)) {
      if (
        normalizedLanguage.includes(key) ||
        key.includes(normalizedLanguage)
      ) {
        return code;
      }
    }

    // Default fallback
    logger.warn(
      `No language code mapping found for: ${language}, using en-US as default`
    );
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
      english: 'en-US-Chirp3-HD-Aoede', // Female Neural2 voice
      'english (us)': 'en-US-Neural2-F',
      'english (uk)': 'en-GB-Neural2-B', // British English
      'english (australia)': 'en-AU-Neural2-B',
      'english (india)': 'en-IN-Neural2-A',

      // European languages
      german: 'de-DE-Chirp3-HD-Aoede',
      french: 'fr-FR-Neural2-A',
      spanish: 'es-ES-Neural2-F',
      italian: 'it-IT-Neural2-A',
      portuguese: 'pt-PT-Neural2-A',
      'portuguese (brazil)': 'pt-BR-Neural2-A',
      dutch: 'nl-NL-Wavenet-B',
      polish: 'pl-PL-Wavenet-A',
      swedish: 'sv-SE-Wavenet-A',
      danish: 'da-DK-Wavenet-A',
      norwegian: 'nb-NO-Wavenet-E',
      finnish: 'fi-FI-Wavenet-A',
      czech: 'cs-CZ-Wavenet-A',
      slovak: 'sk-SK-Wavenet-A',
      hungarian: 'hu-HU-Wavenet-A',
      romanian: 'ro-RO-Wavenet-A',
      greek: 'el-GR-Wavenet-A',

      // Asian languages
      japanese: 'ja-JP-Neural2-B',
      korean: 'ko-KR-Neural2-A',
      chinese: 'cmn-CN-Wavenet-A', // Mandarin
      'chinese (mandarin)': 'cmn-CN-Wavenet-A',
      'chinese (cantonese)': 'yue-HK-Standard-A',
      vietnamese: 'vi-VN-Neural2-A',
      thai: 'th-TH-Neural2-C',
      indonesian: 'id-ID-Wavenet-A',
      malay: 'ms-MY-Wavenet-A',
      hindi: 'hi-IN-Neural2-A',
      tamil: 'ta-IN-Wavenet-A',
      bengali: 'bn-IN-Wavenet-A',

      // Middle Eastern languages
      arabic: 'ar-XA-Wavenet-B',
      turkish: 'tr-TR-Wavenet-A',
      hebrew: 'he-IL-Wavenet-A',
      persian: 'fa-IR-Wavenet-A',

      // Other languages
      russian: 'ru-RU-Wavenet-D',
      ukrainian: 'uk-UA-Wavenet-A',
      filipino: 'fil-PH-Wavenet-A',
      swahili: 'sw-KE-Standard-A',
    };

    // Try to find a direct match
    if (normalizedLanguage in languageVoiceMap) {
      return languageVoiceMap[normalizedLanguage];
    }

    // Try to find a partial match by checking if the normalized language
    // contains any of our supported language keys
    for (const [key, voice] of Object.entries(languageVoiceMap)) {
      if (
        normalizedLanguage.includes(key) ||
        key.includes(normalizedLanguage)
      ) {
        return voice;
      }
    }

    // Default fallback voice if no match found
    logger.warn(
      `No voice found for language: ${language}, using default English voice`
    );
    return 'en-US-Neural2-F';
  }

  private validateEnvironment(): void {
    // Only GOOGLE_CLOUD_PROJECT is strictly required beforehand now.
    // The credentials can come from either Base64 or file path, checked in constructor.
    const requiredVars = ['GOOGLE_CLOUD_PROJECT'];

    const missingVars = requiredVars.filter((v) => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }

    // Add a check: EITHER Base64 OR file path should be present, or warn about ADC.
    if (
      !process.env.GOOGLE_CREDENTIALS_BASE64 &&
      !process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      logger.warn(
        'Neither GOOGLE_CREDENTIALS_BASE64 nor GOOGLE_APPLICATION_CREDENTIALS environment variables are set. Google Auth will attempt Application Default Credentials (ADC). This might not work in all environments without specific configuration.'
      );
    }
    if (
      process.env.GOOGLE_CREDENTIALS_BASE64 &&
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      logger.warn(
        'Both GOOGLE_CREDENTIALS_BASE64 and GOOGLE_APPLICATION_CREDENTIALS are set. Using GOOGLE_CREDENTIALS_BASE64.'
      );
    }
  }
}
