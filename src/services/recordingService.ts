import logger from '@/utils/logger';
import AIService from './aiService';
import MessageGenerator from './generators/messageGenerator';
import MetricsService from './metricsService';

class RecordingService {
  private aiService: AIService;
  private apiKey: string;
  private messageGenerator: MessageGenerator;
  private metricsService: MetricsService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.aiService = new AIService(this.apiKey);
    this.messageGenerator = new MessageGenerator();
    this.metricsService = new MetricsService();
  }

  /**
   * A generic helper function to retry an async operation.
   */
  private async retryOperation<T>(operation: () => Promise<T>, attempts = 3, delayMs = 1000): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.error(`RecordingService operation failed, attempt ${attempt + 1} of ${attempts}.`, error);
        if (attempt < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  async uploadFile(
    audioBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<string> {
    // The retries for uploadFile are already handled in AIService.uploadFile.
    return await this.aiService.uploadFile(audioBuffer, mimeType, fileName);
  }

  async submitRecording(
    userIP: string, 
    fileUri: string,  // File URI returned from the upload
    recordingTime: number, 
    recordingSize: number,
    isDeepAnalysis: boolean
  ): Promise<Record<string, unknown>> {
    try {
      const userMessage = this.messageGenerator.generateUserMessage(isDeepAnalysis);
      const systemMessage = this.messageGenerator.generateSystemMessage(isDeepAnalysis);

      // Generate content using AI service with retry logic.
      const startTime = Date.now();
      const aiResponse = await this.retryOperation(() =>
        this.aiService.generateContent(fileUri, userMessage, systemMessage)
      );
      logger.log("AI Response:", aiResponse);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Collect interaction data with retry logic.
      await this.retryOperation(() =>
        this.metricsService.collectInteractionData(
          userIP, 
          fileUri, 
          aiResponse, 
          recordingTime, 
          responseTime, 
          recordingSize
        )
      );

      return aiResponse;
    } catch (error) {
      logger.error("Error submitting recording:", error);
      throw error;
    }
  }
}

export default RecordingService;
