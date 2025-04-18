import logger from "@/utils/logger";
import { supabase } from "@/repositories/supabase/supabase";
import { LanguageDetectionResponse } from "@/models/Language-detection.model";

class MetricsService {
  constructor() {}

  async collectInteractionData(userIP: string, recording: string, aiResponse: Record<string, unknown>, recordingTime: number, responseTime: number, recordingSize: number, languageDetection: LanguageDetectionResponse): Promise<void> {
    try {
      // Collect relevant data
      const timestamp = new Date();
      const aiResponseLength = JSON.stringify(aiResponse).length;

      // Structure the data
      const interactionData = {
        user_ip: userIP,
        timestamp,
        recording_size: recordingSize,
        response_time: responseTime,
        ai_response_length: aiResponseLength,
        recording_time: recordingTime,
        ai_response: aiResponse,
        recording: recording.length,
        language_detection: languageDetection,
      };

      // Store the data in Supabase
      if (process.env.MOCK_AI_RESPONSE !== 'true' && process.env.NODE_ENV === 'production') {
        await this.storeInteractionData(interactionData);
      }

      logger.log("Interaction data collected and stored:", interactionData);
    } catch (error) {
      logger.error("Error collecting interaction data:", error);
    }
  }

  private async storeInteractionData(data: Record<string, unknown>): Promise<void> {
    try {
      const { error } = await supabase
        .from('interactions')
        .insert([data]);

      if (error) {
        logger.error("Error storing interaction data in Supabase:", error);
        throw error;
      } else {
        logger.log("Interaction data stored in Supabase:", data);
      }
    } catch (error) {
      logger.error("Error storing interaction data:", error);
    }
  }
}

export default MetricsService;
