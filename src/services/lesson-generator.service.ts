import { IAIService } from '@/interfaces/ai-service.interface';
import { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
import { MockLessonGeneratorService } from '@/__mocks__/generated-lessons.mock';
import { GeneratedLesson, LessonStep } from '@/models/AppAllModels.model';
import { MockAssessmentGeneratorService } from '@/__mocks__/generated-assessment-lessons.mock';
import { ITTS } from '@/interfaces/tts.interface';
import path from 'path';
import fs from 'fs';

export interface ILessonGeneratorService {
  generateLesson: (
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string
  ) => Promise<Record<string, unknown>>;
  generateAudioForSteps: (
    steps: LessonStep[],
    language: string,
    sourceLanguage: string
  ) => Promise<LessonStep[]>;
}

class LessonGeneratorService implements ILessonGeneratorService {
  private aiService: IAIService;
  private useMock: boolean;
  private useAudioGeneratorMock: boolean;
  private useAudioUploadMock: boolean;
  private ttsService: ITTS;
  private uploadFunction: (file: File, pathPrefix: string) => Promise<string>;

  constructor(
    aiService: IAIService,
    useMock: boolean = process.env.NEXT_PUBLIC_MOCK_LESSON_GENERATOR === 'true',
    ttsService: ITTS,
    uploadFunction?: (file: File, pathPrefix: string) => Promise<string>
  ) {
    this.aiService = aiService;
    this.useMock = useMock;
    this.useAudioGeneratorMock = process.env.NEXT_PUBLIC_MOCK_AUDIO_GENERATOR === 'true';
    this.useAudioUploadMock = process.env.NEXT_PUBLIC_USE_AUDIO_UPLOAD_MOCK === 'true';
    this.ttsService = ttsService;
    this.uploadFunction = uploadFunction || ((file, _) => Promise.resolve(URL.createObjectURL(file)));
    logger.info('LessonGeneratorService initialized', { 
      useMock: this.useMock,
      useAudioGeneratorMock: this.useAudioGeneratorMock,
      useAudioUploadMock: this.useAudioUploadMock
    });
  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string
  ): Promise<Record<string, unknown>> {
    logger.info('Generating lesson', {
      topic,
      targetLanguage,
      difficultyLevel,
    });
    let aiResponse: Record<string, unknown> | Record<string, unknown>[] = [];
    const prompts = this.generateLessonPrompts(
      topic,
      targetLanguage,
      sourceLanguage,
      difficultyLevel
    );
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

      try {
        lessonsArray.map((lesson) => this.validateLessonsResponse(lesson));
      } catch (error) {
        logger.error('Error validating lessons response:', { error });
        if (!this.useMock) {
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
      }

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

  private validateLessonsResponse(aiResponse: Record<string, unknown>): void {
    logger.info('Validating lessons response', { aiResponse });

    const stepsWithExpectedAnswer = ['practice', 'prompt', 'new_word'];
    const lessonData =
      (aiResponse as { data?: unknown[] }).data?.[0] || aiResponse;

    const steps = (lessonData as any).steps;

    if (steps.length < 0) {
      throw new Error('Invalid lesson format: steps are empty ');
    }

    for (const step of steps) {
      const stepType = step.type;
      const hasExpectedAnswer = step.expectedAnswer !== undefined;

      // Practice and prompt steps must have expected answers
      if (stepsWithExpectedAnswer.includes(stepType) && !hasExpectedAnswer) {
        throw new Error(
          `Step ${step.content} of type ${stepType} is missing expectedAnswer`
        );
      }

      // Other step types should not have expected answers
      if (!stepsWithExpectedAnswer.includes(stepType) && hasExpectedAnswer) {
        throw new Error(
          `Step ${step.content} of type ${stepType} should not have expectedAnswer`
        );
      }
    }
  }

  public async generateAudioForSteps(
    steps: LessonStep[],
    language: string,
    sourceLanguage: string
  ): Promise<LessonStep[]> {
    logger.info('Generating audio for lesson steps', { steps });

    try {
      if (this.useAudioGeneratorMock) {
        logger.info('Using mock audio generator');
        for (const step of steps) {
          const audio = await MockLessonGeneratorService.generateAudioForStep(
            step.content,
            language
          );
          step.contentAudioUrl = audio;
          if (step.expectedAnswer) {
            const audio = await MockLessonGeneratorService.generateAudioForStep(
              step.expectedAnswer!,
              language
            );
            step.expectedAnswerAudioUrl = audio;
          }
        }
        logger.info('Mock audio generated', { steps });
      } else {
        // Real implementation
        for (const step of steps) {
          // Generate content audio in source language
          const contentVoice = this.ttsService.getVoice(sourceLanguage);
          const contentAudioBuffer = await retryOperation(() =>
            this.ttsService.synthesizeSpeech(step.content, sourceLanguage, contentVoice)
          );
          
          const contentFile = this.createAudioFile(contentAudioBuffer, `content_step_${step.stepNumber}.mp3`);
          step.contentAudioUrl = await this.handleAudioOutput(contentFile, 'lessay/lessonStep/audio');

          // Generate expected answer audio in target language if exists
          if (step.expectedAnswer) {
            const answerVoice = this.ttsService.getVoice(language);
            const answerAudioBuffer = await retryOperation(() =>
              this.ttsService.synthesizeSpeech(step.expectedAnswer!, language, answerVoice)
            );
            
            const answerFile = this.createAudioFile(answerAudioBuffer, `answer_step_${step.stepNumber}.mp3`);
            step.expectedAnswerAudioUrl = await this.handleAudioOutput(answerFile, 'lessay/lessonStep/audio');
          }
        }
      }
      return steps;
    } catch (error) {
      logger.error('Error generating audio for lesson:', { error });
      throw error;
    }
  }

  private async handleAudioOutput(file: File, pathPrefix: string): Promise<string> {
    return this.useAudioUploadMock 
      ? await this.saveAudioLocally(file, pathPrefix)
      : await this.uploadFunction(file, pathPrefix);
  }

  private async saveAudioLocally(file: File, pathPrefix: string): Promise<string> {
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const targetDir = path.join(publicDir, pathPrefix);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filePath = path.join(targetDir, filename);
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
      
      return `/${pathPrefix}/${filename}`;
    } catch (error) {
      logger.error('Error saving audio locally', { error });
      throw error;
    }
  }

  private createAudioFile(audioBuffer: string | ArrayBuffer, filename: string): File {
    let blob: Blob;
    
    if (typeof audioBuffer === 'string') {
      const base64Data = audioBuffer.includes(',') 
        ? audioBuffer.split(',')[1]
        : audioBuffer;
      const buffer = Buffer.from(base64Data, 'base64');
      blob = new Blob([buffer], { type: 'audio/mp3' });
    } else {
      blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    }
    
    return new File([blob], filename, { type: 'audio/mp3' });
  }

  private formatLessonResponse(
    aiResponse: Record<string, unknown>
  ): GeneratedLesson {
    logger.info('Formatting lesson response', { aiResponse });

    // Assert that aiResponse.data is an array if it exists
    const lessonData =
      (aiResponse as { data?: unknown[] }).data?.[0] || aiResponse;

    return {
      id: '', // Populated when saved to the database.
      userId: '', // Will be assigned in the lesson service.
      lessonId: '', // To be autogenerated.
      focusArea: (lessonData as any).focusArea || 'General Conversation',
      targetSkills: (lessonData as any).targetSkills || [
        'Vocabulary',
        'Grammar',
      ],
      steps: (lessonData as any).steps || [],
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private generateLessonPrompts(
    topic: string,
    targetLanguage: string,
    sourceLanguage: string,
    difficultyLevel: string
  ): { userPrompt: string; systemPrompt: string } {
    logger.info('Generating lesson prompts', {
      topic,
      targetLanguage,
      sourceLanguage,
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
