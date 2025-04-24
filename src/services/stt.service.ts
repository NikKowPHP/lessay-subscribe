import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos'; // For types
import logger from '@/utils/logger';

// Ensure GOOGLE_APPLICATION_CREDENTIALS is set in your environment for this to work
let speechClient: SpeechClient | null = null;
try {
    speechClient = new SpeechClient();
    logger.info('Google SpeechClient initialized successfully.');
} catch (error) {
    logger.error('Failed to initialize Google SpeechClient:', error);
    // Depending on requirements, you might want to throw here or handle initialization failure downstream
}

export interface SttRequestConfig {
    audioBytes: Buffer; // Raw audio data
    encoding: 'WEBM_OPUS' | 'LINEAR16' | string; // Allow string for flexibility, but define common ones
    sampleRateHertz: number;
    languageCode: string; // e.g., 'en-US'
    enableAutomaticPunctuation?: boolean;
    model?: string; // e.g., 'telephony_short', 'latest_long'
    // Add other relevant RecognitionConfig fields as needed
}

export interface SttResponse {
    transcript: string;
    // Add other relevant fields from the response if needed (e.g., confidence, word timings)
}

export interface ISttService {
    transcribe(config: SttRequestConfig): Promise<SttResponse>;
}

export class GoogleSttService implements ISttService {
    async transcribe(config: SttRequestConfig): Promise<SttResponse> {
        if (!speechClient) {
            throw new Error('Google SpeechClient is not initialized. Check credentials and logs.');
        }

        const {
            audioBytes,
            encoding,
            sampleRateHertz,
            languageCode,
            enableAutomaticPunctuation = true, // Default to true
            model = 'default', // Default model, consider 'telephony_short' or others based on use case
        } = config;

        const recognitionConfig: google.cloud.speech.v1.IRecognitionConfig = {
            encoding: encoding as unknown as google.cloud.speech.v1.RecognitionConfig.AudioEncoding, // Cast needed
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            enableAutomaticPunctuation: enableAutomaticPunctuation,
            model: model,
            // Add other config options here if passed in SttRequestConfig
            // e.g., enableWordTimeOffsets: config.enableWordTimeOffsets,
        };

        const audio = {
            content: audioBytes.toString('base64'), // API expects base64 encoded string
        };

        const requestPayload: google.cloud.speech.v1.IRecognizeRequest = {
            config: recognitionConfig,
            audio: audio,
        };

        try {
            logger.info(`Sending STT request to Google Cloud for language: ${languageCode}, encoding: ${encoding}, rate: ${sampleRateHertz}`);
            const [response] = await speechClient.recognize(requestPayload);
            logger.debug('Received STT response from Google Cloud:', response);

            // Process the response to extract the most likely transcript
            const transcription = response.results
                ?.map(result => result.alternatives?.[0]?.transcript)
                .filter(transcript => transcript !== undefined) // Filter out undefined transcripts
                .join('\n') ?? ''; // Join results and provide empty string if null/undefined

            if (!transcription && response.results && response.results.length > 0) {
                logger.warn('Google STT API returned results but no valid transcriptions found.');
            } else if (!response.results || !response.results.length) {
                logger.warn('Google STT API returned no results.');
            }

            return { transcript: transcription };

        } catch (error) {
            logger.error('Error calling Google Cloud STT API:', error);
            // Re-throw or handle specific Google API errors
            throw new Error(`Google STT API request failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Optional: Factory function (similar to auth service)
// export function getSttService(): ISttService {
//     // Add logic here to potentially return a mock service based on environment variables
//     return new GoogleSttService();
// }
