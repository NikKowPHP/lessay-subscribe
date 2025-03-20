import { IAIService } from '@/interfaces/ai-service.interface';
import { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
import { ILessonGeneratorService } from '@/lib/interfaces/all-interfaces';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';

class LessonGeneratorService implements ILessonGeneratorService {
  private aiService: IAIService;
  private useMock: boolean;

  constructor(aiService: IAIService, useMock: boolean = process.env.NEXT_PUBLIC_MOCK_LESSON_GENERATOR === 'true') {
    this.aiService = aiService;
    this.useMock = useMock;
  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): Promise<Record<string, unknown>> {
    try {
      // Use mock data in test environment or when explicitly requested
      if (this.useMock) {
        logger.log("Using mock lesson generator for topic:", topic);
        return MockLessonGeneratorService.generateLesson(topic, targetLanguage, difficultyLevel);
      }

      // Otherwise use actual AI service
      const prompts = this.generateLessonPrompts(topic, targetLanguage, difficultyLevel);
      
      const lesson = await retryOperation(() =>
        this.aiService.generateContent(
          '', // No file URI needed
          prompts.userPrompt,
          prompts.systemPrompt,
          models.gemini_2_pro_exp
        )
      );

      logger.log("Generated Lesson for topic:", topic);
      return this.formatLessonResponse(lesson);
    } catch (error) {
      logger.error("Error generating lesson:", error);
      throw error;
    }
  }

  private formatLessonResponse(aiResponse: Record<string, unknown>): Record<string, unknown> {
    // Transform AI response to expected format if needed
    return {
      data: {
        focusArea: aiResponse.focusArea || 'General Conversation',
        targetSkills: aiResponse.targetSkills || ['Vocabulary', 'Grammar'],
        sequence: aiResponse.sequence || [],
        performance_metrics: null
      }
    };
  }

  private generateLessonPrompts(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): { userPrompt: string; systemPrompt: string } {
    return {
      systemPrompt: `You are a helpful language tutor teaching ${targetLanguage}. 
        Create engaging lessons appropriate for ${difficultyLevel} level learners.
        Structure the lesson with a sequence of steps including prompts, new words, 
        practice opportunities, and model answers.`,
      userPrompt: `Create a comprehensive lesson about "${topic}" in ${targetLanguage} 
        for ${difficultyLevel} level students.
        Format the response as JSON with:
        - focusArea: The main focus of the lesson
        - targetSkills: Array of skills being taught
        - sequence: Array of lesson steps with:
          - step: number (sequential)
          - type: one of [prompt, new_word, practice, model_answer]
          - content: The content of the step
          - translation: English translation if applicable
        Do not include user_answer steps as these will be populated during the lesson.`
    };
  }
}

export default LessonGeneratorService;