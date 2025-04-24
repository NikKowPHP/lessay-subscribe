import { SpeechClient } from '@google-cloud/speech'; // Keep SpeechClient import
import { google } from '@google-cloud/speech/build/protos/protos'; // For types
import logger from '@/utils/logger';

export interface SttRequestConfig {
    audioBytes: Buffer;
    encoding: 'WEBM_OPUS' | 'LINEAR16' | string;
    sampleRateHertz: number;
    languageCode: string;
    enableAutomaticPunctuation?: boolean;
    model?: string;
}

export interface SttResponse {
    transcript: string;
}

export interface ISttService {
    transcribe(config: SttRequestConfig): Promise<SttResponse>;
}

// --- Initialize Client with Credential Handling ---
let speechClient: SpeechClient | null = null;
try {
    // Define a variable to hold the options object for the constructor
    let clientOptions: ConstructorParameters<typeof SpeechClient>[0] = {}; // Use ConstructorParameters to get the type

    // Check if running in an environment with Base64 credentials
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        let decodedCredentials = '';
        try {
            logger.info('STT Service: Found GOOGLE_CREDENTIALS_BASE64, decoding...');
            let rawBase64 = process.env.GOOGLE_CREDENTIALS_BASE64.trim().replace(/%/g, '');
            decodedCredentials = Buffer.from(rawBase64, 'base64').toString('utf-8');

            const credentials = JSON.parse(decodedCredentials);
            // Assign credentials directly to the options object
            clientOptions = { credentials };
            logger.info('STT Service: Using decoded Base64 credentials.');

        } catch (error) {
            logger.error(
                'STT Service: Failed to decode/parse GOOGLE_CREDENTIALS_BASE64. Falling back.',
                {
                    base64Start: process.env.GOOGLE_CREDENTIALS_BASE64?.substring(0, 20),
                    decodedStart: decodedCredentials?.substring(0, 100),
                    error: (error as Error).message
                }
            );
            // Fallback: clientOptions remains empty, allowing library default behavior
            clientOptions = {};
        }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        logger.info(
            `STT Service: Using GOOGLE_APPLICATION_CREDENTIALS file path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
        );
        // No need to set clientOptions, library handles the env var automatically
    } else {
        logger.warn(
            'STT Service: Neither GOOGLE_CREDENTIALS_BASE64 nor GOOGLE_APPLICATION_CREDENTIALS is set. Attempting Application Default Credentials (ADC).'
        );
        // No need to set clientOptions, library handles ADC automatically
    }

    // Instantiate the client with the potentially populated options object
    speechClient = new SpeechClient(clientOptions);
    logger.info('Google SpeechClient initialized successfully (using determined credentials).');

} catch (error) {
    logger.error('Failed to initialize Google SpeechClient:', error);
    // speechClient remains null, transcribe method will throw
}
// --- End Client Initialization ---


export class GoogleSttService implements ISttService {
    async transcribe(config: SttRequestConfig): Promise<SttResponse> {
        if (!speechClient) {
            throw new Error('Google SpeechClient is not initialized. Check credentials (Base64, file path, or ADC) and logs.');
        }

        const {
            audioBytes,
            encoding,
            sampleRateHertz,
            languageCode,
            enableAutomaticPunctuation = true,
            model = 'default',
        } = config;

        const recognitionConfig: google.cloud.speech.v1.IRecognitionConfig = {
            encoding: encoding as unknown as google.cloud.speech.v1.RecognitionConfig.AudioEncoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            enableAutomaticPunctuation: enableAutomaticPunctuation,
            model: model,
        };

        const audio = {
            content: audioBytes.toString('base64'),
        };

        const requestPayload: google.cloud.speech.v1.IRecognizeRequest = {
            config: recognitionConfig,
            audio: audio,
        };

        try {
            logger.info(`Sending STT request to Google Cloud for language: ${languageCode}, encoding: ${encoding}, rate: ${sampleRateHertz}`);
            const [response] = await speechClient.recognize(requestPayload);
            logger.debug('Received STT response from Google Cloud:', JSON.stringify(response)); // Log full response for debug

            const transcription = response.results
                ?.map(result => result.alternatives?.[0]?.transcript)
                .filter(transcript => transcript !== undefined)
                .join('\n') ?? '';

            if (!transcription && response.results && response.results.length > 0) {
                logger.warn('Google STT API returned results but no valid transcriptions found.');
            } else if (!response.results || response.results.length === 0) {
                logger.warn('Google STT API returned no results.');
            }

            return { transcript: transcription };

        } catch (error) {
            logger.error('Error calling Google Cloud STT API:', error);
            throw new Error(`Google STT API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}