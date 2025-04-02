import { ITTS } from '@/interfaces/tts.interface';
import logger from '@/utils/logger';
import axios from 'axios';
import { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class GoogleTTS implements ITTS {
  private auth: GoogleAuth;

  private googleProjectId: string;

  private proxyAgent: unknown | undefined;

  constructor() {
    this.validateEnvironment(); // Checks required vars like GOOGLE_CLOUD_PROJECT
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
    this.googleProjectId = projectId;
    this.proxyAgent = this.createProxyAgent();

    const authOptions: GoogleAuthOptions = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    };

    // Check if running in an environment with Base64 credentials
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      let decodedCredentials = '';
      try {
        logger.info(
          'Found GOOGLE_CREDENTIALS_BASE64, decoding and using for Google Auth.'
        );
        let rawBase64 = process.env.GOOGLE_CREDENTIALS_BASE64.trim();

        rawBase64 = rawBase64.replace(/%/g, '');
        logger.info('rawBase64', rawBase64);
        decodedCredentials = Buffer.from(rawBase64, 'base64').toString();
        logger.info(
          'Decoded Credentials (first 100 chars):',
          decodedCredentials.substring(0, 100) + '...'
        );

        const credentials = JSON.parse(decodedCredentials);
        authOptions.credentials = credentials;

        if (
          credentials.project_id &&
          credentials.project_id !== this.googleProjectId
        ) {
          logger.warn(
            `Project ID mismatch: GOOGLE_CLOUD_PROJECT is ${this.googleProjectId}, but credentials file has ${credentials.project_id}. Using ID from credentials.`
          );
          this.googleProjectId = credentials.project_id;
        }
      } catch (error) {
        logger.error(
          'Failed to decode/parse GOOGLE_CREDENTIALS_BASE64. Decoded string causing error (first 100 chars):',
          decodedCredentials
            ? decodedCredentials.substring(0, 100) + '...'
            : 'Input string was empty, invalid Base64, or not captured.'
        );
        logger.error('Underlying Error:', error);
        throw new Error(
          'Failed to initialize Google Auth from Base64 credentials. Check Base64 encoding and JSON validity.'
        );
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      logger.info(
        `Using GOOGLE_APPLICATION_CREDENTIALS file path for Google Auth: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
      );
    } else {
      logger.warn(
        'Neither GOOGLE_CREDENTIALS_BASE64 nor GOOGLE_APPLICATION_CREDENTIALS is set. Attempting Application Default Credentials (ADC).'
      );
    }

    // Initialize GoogleAuth
    try {
      this.auth = new GoogleAuth(authOptions);
    } catch (authError) {
      logger.error('Failed to initialize GoogleAuth instance:', authError);
      throw new Error(
        `Google Auth initialization failed: ${
          authError instanceof Error ? authError.message : String(authError)
        }`
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

  private createProxyAgent(): unknown | undefined {
    const proxyUrl =
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy;

    if (proxyUrl) {
      try {
        logger.log(`Using proxy: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
      } catch (err) {
        logger.error('Error creating proxy agent:', err);
        return undefined;
      }
    }
    return undefined;
  }

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

      const config: Record<string, unknown> = {
        method: 'post',
        url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-User-Project': this.googleProjectId,
          Authorization: `Bearer ${accessToken}`,
        },
        data: requestData,
        timeout: 10000,
        responseType: 'text',
        validateStatus: () => true,
      };

      if (this.proxyAgent) {
        config.httpsAgent = this.proxyAgent;
        config.proxy = false;
      }

      const response = await axios(config);

      // Detect proxy interference by checking for HTML response
      if (
        typeof response.data === 'string' &&
        response.data.includes('</html>')
      ) {
        logger.error('Proxy interference detected', {
          status: response.status,
          data: response.data.substring(0, 200), // Log first 200 chars of HTML
        });
        throw new Error(
          'Network gateway error occurred - received HTML response instead of API response'
        );
      }

      // Try to parse JSON if we got through proxy
      const responseData =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;

      // Handle HTTP errors
      if (response.status >= 400) {
        logger.error('Google TTS API Error:', {
          status: response.status,
          errorDetails: responseData?.error || 'No error details',
        });
        throw new Error(
          `Google TTS API Error: ${response.status} - ${
            responseData?.error?.message || 'Unknown error'
          }`
        );
      }

      if (!responseData?.audioContent) {
        logger.error(
          'Invalid response structure from Google TTS API:',
          responseData
        );
        throw new Error(
          'Malformed response from Google TTS - missing audioContent'
        );
      }

      return responseData.audioContent;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.warn('Google TTS request timeout');
          throw new Error('Google TTS request timed out');
        }
        if (
          error.response?.data &&
          typeof error.response.data === 'string' &&
          error.response.data.includes('</html>')
        ) {
          logger.error('Proxy interference detected in error response');
          throw new Error(
            'Persistent proxy interference - check network configuration'
          );
        }
      }

      logger.error('Google TTS synthesis error:', error);
      throw new Error(
        `Failed to synthesize speech: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
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
