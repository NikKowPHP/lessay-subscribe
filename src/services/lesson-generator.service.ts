import { IAIService } from '@/interfaces/ai-service.interface';
import { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
import { ILessonGeneratorService } from '@/lib/interfaces/all-interfaces';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';
import { GeneratedLesson, LessonStep } from '@/models/AppAllModels.model';
import { MockAssessmentGeneratorService } from '@/__mocks__/generated-assessment-lessons.mock';
import { ITTS } from '@/interfaces/tts.interface';

class LessonGeneratorService implements ILessonGeneratorService {
  private aiService: IAIService;
  private useMock: boolean;
  private ttsService: ITTS;

  constructor(
    aiService: IAIService,
    useMock: boolean = process.env.NEXT_PUBLIC_MOCK_LESSON_GENERATOR === 'true',
    ttsService: ITTS
  ) {
    this.aiService = aiService;
    this.useMock = useMock;
    this.ttsService = ttsService;
    logger.info('LessonGeneratorService initialized', { useMock });
  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): Promise<Record<string, unknown>> {
    logger.info('Generating lesson', {
      topic,
      targetLanguage,
      difficultyLevel,
    });
    let aiResponse: Record<string, unknown> | Record<string, unknown>[] = [];
    try {
      if (this.useMock) {
        logger.info('Using mock lesson generator for topic:', topic);
        const mockLesson = await MockLessonGeneratorService.generateLesson(
          topic,
          targetLanguage,
          difficultyLevel
        );
        logger.info('Mock lesson generated', { topic, mockLesson });
        aiResponse = mockLesson;
      } else {
        const prompts = this.generateLessonPrompts(
          topic,
          targetLanguage,
          difficultyLevel
        );
        logger.info('Generated prompts for lesson', { prompts });

        const aiResponse = await retryOperation(() =>
          this.aiService.generateContent(
            '', // No file URI needed
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_5_pro_exp
          )
        );
        logger.info('AI response received', { aiResponse });
      }

      const lessonsArray = Array.isArray(aiResponse)
        ? aiResponse
        : [aiResponse];
      const generatedLessons = lessonsArray.map((lesson) =>
        this.formatLessonResponse(lesson)
      );
      logger.info('Formatted lessons', { generatedLessons });

      return { data: generatedLessons };
    } catch (error) {
      logger.error('Error generating lesson:', {
        topic,
        targetLanguage,
        difficultyLevel,
        error,
      });
      throw error;
    }
  }


  public async generateAudioForSteps(
    steps: LessonStep[],
    language: string
  ): Promise<LessonStep[]> {
    logger.info('Generating audio for assessment lesson', {
      steps,
    });

    try {
      if (this.useMock) {
        logger.info('Using mock assessment generator');

        for (const step of steps) {
          const audio =
            await MockLessonGeneratorService.generateAudioForStep(
              step.content,
              language
            );
          step.contentAudioUrl = audio;
          if (step.expectedAnswer) {
            const audio =
              await MockLessonGeneratorService.generateAudioForStep(
                step.expectedAnswer!,
                language
              );
            step.expectedAnswerAudioUrl = audio;
          }
        }
        logger.info('Mock assessment generated', { steps });
      } else {
        // get appropriate voice
        const voice = this.ttsService.getVoice(language);

        for (const step of steps) {
          const audio = await retryOperation(() =>
            this.ttsService.synthesizeSpeech(step.content, language, voice)
          );
          step.contentAudioUrl = audio.toString('base64');
          if (step.expectedAnswer) {
            const audio = await retryOperation(() =>
              this.ttsService.synthesizeSpeech(
                step.expectedAnswer!,
                language,
                voice
              )
            );
            step.expectedAnswerAudioUrl = audio.toString('base64');
            // TODO: keep audio in buffer, download to vercel blob and get the link, attach link here. 
          }
        }
      }

      return steps;
    } catch (error) {
      logger.error('Error generating audio for assessment:', {
        error,
      });
      throw error;
    }
  }

  private formatLessonResponse(
    aiResponse: Record<string, unknown>
  ): GeneratedLesson {
    logger.info('Formatting lesson response', { aiResponse });
    
    // Assert that aiResponse.data is an array if it exists
    const lessonData = ((aiResponse as { data?: unknown[] }).data?.[0]) || aiResponse;

    return {
      id: '', // Populated when saved to the database.
      userId: '', // Will be assigned in the lesson service.
      lessonId: '', // To be autogenerated.
      focusArea: (lessonData as any).focusArea || 'General Conversation',
      targetSkills: (lessonData as any).targetSkills || ['Vocabulary', 'Grammar'],
      steps: (lessonData as any).steps || [],
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private generateLessonPrompts(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string
  ): { userPrompt: string; systemPrompt: string } {
    logger.info('Generating lesson prompts', {
      topic,
      targetLanguage,
      difficultyLevel,
    });
    return {
      systemPrompt: `You are a helpful language tutor teaching ${targetLanguage}. 
        Create engaging lessons appropriate for ${difficultyLevel} level learners.
        Structure the lesson with a steps of steps including prompts, new words, 
        practice opportunities, and model answers.`,
      userPrompt: `Create a comprehensive lesson about "${topic}" in ${targetLanguage} 
        for ${difficultyLevel} level students.
        Format the response as JSON with:
        - focusArea: The main focus of the lesson
        - targetSkills: Array of skills being taught
        - steps: Array of lesson steps with:
          - step: number (sequential)
          - type: one of [prompt, new_word, practice, model_answer]
          - content: The content of the step
          - translation: English translation if applicable
        Do not include user_answer steps as these will be populated during the lesson.`,
    };
  }
}

export default LessonGeneratorService;
