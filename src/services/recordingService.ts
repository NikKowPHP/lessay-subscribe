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

  async submitRecording(
    userIP: string, 
    audioData: string,  // Changed from 'recording' to 'audioData'
    recordingTime: number, 
    recordingSize: number
  ): Promise<Record<string, unknown>> {
    try {
      const userMessage = this.messageGenerator.generateUserMessage(audioData);
      const systemMessage = this.messageGenerator.generateSystemMessage();

      // Generate content using AI service
      const startTime = Date.now();

      const aiResponse = await this.aiService.generateContent(
        audioData,  // Pass the base64 string directly
        userMessage, 
        systemMessage
      );
      // const aiResponse = mockResponse; // Use mock response
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Collect interaction data
      await this.metricsService.collectInteractionData(
        userIP, 
        audioData, 
        aiResponse, 
        recordingTime, 
        responseTime, 
        recordingSize
      );

      return aiResponse;
    } catch (error) {
      logger.error("Error submitting recording:", error);
      throw error;
    }
  }
  




}




export default RecordingService;
