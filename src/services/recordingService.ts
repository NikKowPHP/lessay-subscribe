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

  async submitRecording(userIP: string, recording: any, recordingTime: number, recordingSize: number): Promise<any> {
    try {
      const userMessage = this.messageGenerator.generateUserMessage(recording);
      const systemMessage = this.messageGenerator.generateSystemMessage();


      // Generate content using AI service
      const startTime = Date.now();
      const aiResponse = await this.aiService.generateContent(recording, userMessage, systemMessage);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Collect interaction data
      await this.metricsService.collectInteractionData(userIP, recording, aiResponse, recordingTime, responseTime, recordingSize);

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
