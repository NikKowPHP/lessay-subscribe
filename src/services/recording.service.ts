import logger from '@/utils/logger';
import AIService, { models } from './ai.service';
import MessageGenerator from './generators/messageGenerator';
import MetricsService from './metrics.service';
import { retryOperation } from '@/utils/retryWithOperation';
import { LanguageDetectionResponse } from '@/models/Language-detection.model';

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

      let aiResponse: any;
      try {

      aiResponse = await retryOperation(() =>
        this.aiService.generateContent(fileUri, personalizedPrompts.userPrompt, personalizedPrompts.systemPrompt, models.gemini_2_pro_exp)
      );
      logger.log("AI Response:", aiResponse);
      } catch (error) {
        logger.error("Error generating content with the error:", error);
        aiResponse = await retryOperation(() => this.aiService.generateContent(fileUri, personalizedPrompts.userPrompt, personalizedPrompts.systemPrompt, models.gemini_2_0_flash));
      }

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
    const response = await this.aiService.generateContent(fileUri, userPrompt, systemPrompt, models.gemini_2_0_flash);
    return response as unknown as LanguageDetectionResponse;
  }
}

export default RecordingService;
