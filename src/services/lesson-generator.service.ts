import { IAIService } from '@/interfaces/ai-service.interface';
import AIService, { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
import { ILessonGeneratorService } from '@/lib/interfaces/all-interfaces';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';

class LessonGeneratorService implements ILessonGeneratorService{
  private aiService: IAIService;

  constructor(aiService: IAIService) {
    this.aiService = aiService;
  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): Promise<Record<string, unknown>> {
    try {
      const prompts = this.generateLessonPrompts(topic, targetLanguage, difficultyLevel);
      
      
      const lesson = MockLessonGeneratorService.generateLesson(topic, targetLanguage, difficultyLevel)

      logger.log("Generated Lesson:", lesson);
      return lesson;
    } catch (error) {
      logger.error("Error generating lesson:", error);
      throw error;
    }
  }

  private generateLessonPrompts(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): { userPrompt: string; systemPrompt: string } {
    return {
      systemPrompt: `You are a helpful language tutor teaching ${targetLanguage}. 
        Create engaging lessons appropriate for ${difficultyLevel} level learners.`,
      userPrompt: `Create a comprehensive lesson about ${topic} in ${targetLanguage}. 
        Include vocabulary, grammar points, and example sentences. 
        Format the response in JSON with sections for vocabulary, grammar, and examples.`
    };
  }
}

export default LessonGeneratorService;