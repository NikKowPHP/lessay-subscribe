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

  async submitRecording(userId: string, recording: any, recordingTime: number): Promise<any> {
    try {
      const userMessage = this.messageGenerator.generateUserMessage(recording);
      const systemMessage = this.messageGenerator.generateSystemMessage();

      // Combine messages or format as needed for your AI service
      const prompt = `${systemMessage}\n${userMessage}`;

      // Generate content using AI service
      const startTime = Date.now();
      const aiResponse = await this.aiService.generateContent(prompt);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Collect interaction data
      await this.metricsService.collectInteractionData(userId, recording, aiResponse, recordingTime, responseTime);

      return aiResponse;
    } catch (error) {
      console.error("Error submitting recording:", error);
      throw error;
    }
  }
  

  private async processRecording(recording: any): Promise<string> {
    // Placeholder for recording processing logic
    // In a real application, this would involve converting the recording to text
    // using a service like Google Cloud Speech-to-Text or similar.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("This is a sample transcription from the recording.");
      }, 1000);
    });
  }
}

export default RecordingService;
