import logger from '@/utils/logger';
import AIService from './ai.service';
import MessageGenerator from './generators/messageGenerator';
import MetricsService from './metrics.service';
import { retryOperation } from '@/utils/retryWithOperation';

class RecordingService {
  private aiService: AIService;
  private messageGenerator: MessageGenerator;
  private metricsService: MetricsService;

  constructor() {
    this.aiService = new AIService();
    this.messageGenerator = new MessageGenerator();
    this.metricsService = new MetricsService();
  }

  /**
   * A generic helper function to retry an async operation.
   */
  

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

      // Generate content using AI service with retry logic.
      const startTime = Date.now();

      const detectedTargetLanguage= await retryOperation(() => this.detectTargetLanguage(fileUri));

      logger.log("Detected Target Language:", detectedTargetLanguage);

      const personalizedPrompts = this.messageGenerator.generatePersonalizedPrompts(detectedTargetLanguage, isDeepAnalysis);

      logger.log("Personalized Prompts:", personalizedPrompts);

      const aiResponse = await retryOperation(() =>
        this.aiService.generateContent(fileUri, personalizedPrompts.userPrompt, personalizedPrompts.systemPrompt)
      );
      logger.log("AI Response:", aiResponse);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Collect interaction data with retry logic.
      await retryOperation(() =>
        this.metricsService.collectInteractionData(
          userIP, 
          fileUri, 
          aiResponse, 
          recordingTime, 
          responseTime, 
          recordingSize,
          detectedTargetLanguage
        )
      );

      return aiResponse;
    } catch (error) {
      logger.error("Error submitting recording:", error);
      throw error;
    }
  }


  private async detectTargetLanguage(fileUri: string): Promise<LanguageDetectionResponse> {
    const { userPrompt, systemPrompt } = this.messageGenerator.generateTargetLanguageDetectionPrompt();
    const response = await this.aiService.generateContent(fileUri, userPrompt, systemPrompt);
    return response as unknown as LanguageDetectionResponse;
  }
}

export default RecordingService;
