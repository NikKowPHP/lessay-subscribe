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
import { LessonModel } from '@/models/AppAllModels.model';

export interface ILessonGeneratorService {
  generateLesson: (
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string,
    assessmentData?: {
      metrics?: {
        accuracy?: number;
        pronunciationScore?: number;
        grammarScore?: number;
        vocabularyScore?: number;
        overallScore?: number;
        strengths?: string[];
        weaknesses?: string[];
      };
      completedAssessment?: boolean;
      proposedTopics?: string[];
      summary?: string;
    }
  ) => Promise<Record<string, unknown>>;
  generateAudioForSteps: (
    steps: LessonStep[],
    language: string,
    sourceLanguage: string
  ) => Promise<LessonStep[]>;
  generateLessonCompletionResults: (
    lesson: LessonModel,
    userResponses: { stepId: string; response: string }[]
  ) => Promise<{
    metrics: {
      accuracy: number;
      pronunciationScore: number;
      grammarScore: number;
      vocabularyScore: number;
      overallScore: number;
      strengths: string[];
      weaknesses: string[];
    };
    summary: string;
    nextLessonSuggestions: string[];
  }>;
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
    ttsService: ITTS,
    uploadFunction?: (file: File, pathPrefix: string) => Promise<string>
  ) {
    this.aiService = aiService;
    this.ttsService = ttsService;
    this.uploadFunction = uploadFunction || ((file, _) => Promise.resolve(URL.createObjectURL(file)));
    // this.useMock = process.env.NEXT_PUBLIC_MOCK_LESSON_GENERATOR === 'true';
    this.useMock = false;
    this.useAudioGeneratorMock = process.env.NEXT_PUBLIC_MOCK_AUDIO_GENERATOR === 'true';
    this.useAudioUploadMock = process.env.NEXT_PUBLIC_USE_AUDIO_UPLOAD_MOCK === 'true';
    logger.info('LessonGeneratorService initialized', { 
      useMock: this.useMock,
      useAudioGeneratorMock: this.useAudioGeneratorMock,
      useAudioUploadMock: this.useAudioUploadMock
    });
    // TODO: Text lesson gen prod

  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string,
    assessmentData?: {
      metrics?: {
        accuracy?: number;
        pronunciationScore?: number;
        grammarScore?: number;
        vocabularyScore?: number;
        overallScore?: number;
        strengths?: string[];
        weaknesses?: string[];
      };
      completedAssessment?: boolean;
      proposedTopics?: string[];
      summary?: string;
    }
  ): Promise<Record<string, unknown>> {
    logger.info('Generating lesson', {
      topic,
      targetLanguage,
      difficultyLevel,
      hasAssessmentData: !!assessmentData
    });
    let aiResponse: Record<string, unknown> | Record<string, unknown>[] = [];
    const prompts = this.generateLessonPrompts(
      topic,
      targetLanguage,
      sourceLanguage,
      difficultyLevel,
      assessmentData
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
     
        // TODO: after lessons created we should refresh the ui 
        logger.info('Generated prompts for lesson', { prompts });

        aiResponse = await retryOperation(() =>
          this.aiService.generateContent(
            '', // No file URI needed
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_0_flash
          )
        );
        logger.info('AI response received for lesson generation', { aiResponse });
      }

      const lessonsArray = Array.isArray(aiResponse)
        ? aiResponse
        : [aiResponse];

      try {
        lessonsArray.map((lesson) => this.validateLessonsResponse(lesson));
      } catch (error) {
        logger.error('Error validating lessons response:', { error });
        if (!this.useMock) {
          aiResponse = await retryOperation(() =>
            this.aiService.generateContent(
              '', // No file URI needed
              prompts.userPrompt,
              prompts.systemPrompt,
              models.gemini_2_0_flash
            )
          );
          logger.info('AI response received for lesson generation', { aiResponse });
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
    difficultyLevel: string,
    assessmentData?: {
      metrics?: {
        accuracy?: number;
        pronunciationScore?: number;
        grammarScore?: number;
        vocabularyScore?: number;
        overallScore?: number;
        strengths?: string[];
        weaknesses?: string[];
      };
      completedAssessment?: boolean;
      proposedTopics?: string[];
      summary?: string;
    }
  ): { userPrompt: string; systemPrompt: string } {
    logger.info('Generating lesson prompts', {
      topic,
      targetLanguage,
      sourceLanguage,
      difficultyLevel,
      hasAssessmentData: !!assessmentData
    });
    
    // Create assessment context if available
    let assessmentContext = '';
    if (assessmentData?.completedAssessment && assessmentData?.metrics) {
      assessmentContext = `
      The student has completed an initial assessment with the following results:
      - Overall proficiency: ${assessmentData.metrics.overallScore || 'Not measured'}/100
      - Pronunciation score: ${assessmentData.metrics.pronunciationScore || 'Not measured'}/100
      - Grammar score: ${assessmentData.metrics.grammarScore || 'Not measured'}/100
      - Vocabulary score: ${assessmentData.metrics.vocabularyScore || 'Not measured'}/100
      - Accuracy: ${assessmentData.metrics.accuracy || 'Not measured'}/100
      
      Strengths: ${assessmentData.metrics.strengths?.join(', ') || 'None identified'}
      
      Areas for improvement: ${assessmentData.metrics.weaknesses?.join(', ') || 'None identified'}
      
      Assessment summary: ${assessmentData.summary || 'Not available'}
      
      Recommended topics: ${assessmentData.proposedTopics?.join(', ') || topic}`;
    }
    
    return {
      systemPrompt: `You are an expert language tutor specialized in teaching ${targetLanguage} to ${sourceLanguage} speakers.
        Your task is to create a comprehensive, engaging, and pedagogically sound lesson for ${difficultyLevel} level learners.
        
        The lesson should follow best practices in language education:
        - Progressive difficulty that challenges but doesn't overwhelm learners
        - Clear explanations with examples in both languages
        - Varied practice opportunities and interactive elements
        - Cultural context when relevant to vocabulary or expressions
        - Supportive feedback that encourages learning
        
        Structure the lesson with a clear progression from introduction to practice to summary:
        1. Start with an instruction explaining the lesson focus
        2. Introduce new vocabulary or concepts with translations
        3. Provide practice opportunities with expected answers
        4. Include appropriate feedback for reinforcement
        5. End with a summary that reviews what was learned
        
        For each step, consider how it builds on previous knowledge and prepares for the next step.
        Your lesson should be optimized for audio-based learning, as most content will be spoken aloud.
        ${assessmentData?.completedAssessment ? 
          `\n\nYou have access to the student's assessment results. Use this information to personalize the lesson, 
          focusing on addressing identified weaknesses while building upon their strengths.` : ''}`,
        
      userPrompt: `Create a comprehensive lesson about "${topic}" in ${targetLanguage} 
        for ${difficultyLevel} level students who speak ${sourceLanguage}.
        ${assessmentData?.completedAssessment ? `\n${assessmentContext}\n` : ''}
        
        Format the response as JSON with:
        {
          "focusArea": "The main focus of the lesson (e.g., Travel Vocabulary, Grammar Rules)",
          "targetSkills": ["Array of specific skills being taught"],
          "steps": [
            {
              "stepNumber": 1,
              "type": "instruction",
              "content": "Clear instructions about the lesson in ${sourceLanguage}",
              "translation": "Translation in ${targetLanguage} if applicable"
            },
            {
              "stepNumber": 2,
              "type": "new_word",
              "content": "New vocabulary in ${targetLanguage}",
              "translation": "Translation in ${sourceLanguage}",
              "expectedAnswer": "Expected pronunciation/response",
              "maxAttempts": 3
            },
            {
              "stepNumber": 3,
              "type": "practice",
              "content": "Practice prompt in ${targetLanguage} or ${sourceLanguage}",
              "translation": "Translation if needed",
              "expectedAnswer": "Expected answer in ${targetLanguage}",
              "maxAttempts": 2
            },
            {
              "stepNumber": 4,
              "type": "feedback",
              "content": "Supportive feedback in ${sourceLanguage}",
              "translation": "Translation in ${targetLanguage}",
              "maxAttempts": 2
            },
            {
              "stepNumber": 5,
              "type": "prompt",
              "content": "Question or task for the user in ${sourceLanguage}",
              "translation": "Translation if needed",
              "expectedAnswer": "Expected answer in ${targetLanguage}",
              "maxAttempts": 2
            },
            {
              "stepNumber": 6,
              "type": "summary",
              "content": "Summary of what was learned in ${sourceLanguage}",
              "translation": "Translation in ${targetLanguage}",
              "maxAttempts": 2
            }
          ]
        }
        
        Ensure the lesson:
        - Is appropriate for ${difficultyLevel} level (vocabulary, grammar complexity)
        - Contains 5-8 total steps that flow naturally
        - Includes at least one instruction, one new_word, one practice, one prompt, and one summary step
        - Has accurate translations and expected answers
        - Provides clear, concise content suitable for audio delivery
        ${assessmentData?.completedAssessment ? 
          `- Directly addresses the student's weaknesses identified in their assessment
          - Builds upon their strengths to maintain engagement and confidence
          - Focuses particularly on: ${assessmentData.metrics?.weaknesses?.join(', ') || 'general improvement'}` : ''}
        
        Do not include user responses or contentAudioUrl fields as these will be populated during the lesson.`
    };
  }

  async generateLessonCompletionResults(
    lesson: LessonModel,
    userResponses: { stepId: string; response: string }[]
  ): Promise<{
    metrics: {
      accuracy: number;
      pronunciationScore: number;
      grammarScore: number;
      vocabularyScore: number;
      overallScore: number;
      strengths: string[];
      weaknesses: string[];
    };
    summary: string;
    nextLessonSuggestions: string[];
  }> {
    logger.info('Generating lesson completion results', {
      lessonId: lesson.id,
      responseCount: userResponses.length
    });
    
    const prompts = this.generateLessonCompletionPrompts(lesson, userResponses);
    
    try {
      let aiResponse;
      
      if (this.useMock) {
        logger.info('Using mock data for lesson completion results');
        // Mock results for testing
        aiResponse = {
          metrics: {
            accuracy: 85,
            pronunciationScore: 78,
            grammarScore: 82,
            vocabularyScore: 80,
            overallScore: 81,
            strengths: ['Basic vocabulary usage', 'Question formation'],
            weaknesses: ['Article usage', 'Verb conjugation in past tense']
          },
          summary: `Good progress with ${lesson.focusArea}. You demonstrated solid understanding of the core concepts, though there are some areas to improve.`,
          nextLessonSuggestions: ['Grammar fundamentals', 'Past tense expressions', 'Everyday conversation']
        };
      } else {
        const result = await retryOperation(() =>
          this.aiService.generateContent(
            '',
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_0_flash
          )
        );
        
        aiResponse = this.formatLessonCompletionResults(result);
        logger.info('Generated real lesson completion results', { aiResponse });
      }
      
      logger.info('Generated lesson completion results', { aiResponse });
      return aiResponse;
    } catch (error) {
      logger.error('Error generating lesson completion results', { error });
      throw new Error('Failed to generate lesson completion analysis');
    }
  }

  private formatLessonCompletionResults(
    aiResponse: Record<string, unknown>
  ):{
    metrics: {
      accuracy: number;
      pronunciationScore: number;
      grammarScore: number;
      vocabularyScore: number;
      overallScore: number;
      strengths: string[];
      weaknesses: string[];
    };
    summary: string;
    nextLessonSuggestions: string[];
  } {
    return {
      metrics: aiResponse.metrics as any,
      summary: aiResponse.summary as string,
      nextLessonSuggestions: aiResponse.nextLessonSuggestions as string[]
    };
  }

  private generateLessonCompletionPrompts(
    lesson: LessonModel,
    userResponses: { stepId: string; response: string }[]
  ): { userPrompt: string; systemPrompt: string } {
    // Create a map of step ID to user response for easier lookup
    const responseMap = new Map(
      userResponses.map(item => [item.stepId, item.response])
    );
    
    // Format steps with user responses for analysis
    const stepsWithResponses = lesson.steps.map(step => {
      const userResponse = responseMap.get(step.id) || '';
      const userResponseHistory = step.userResponseHistory 
        ? (JSON.parse(step.userResponseHistory as string) as string[]) 
        : [];
      
      return {
        stepNumber: step.stepNumber,
        type: step.type,
        content: step.content,
        expectedAnswer: step.expectedAnswer,
        userResponse,
        userResponseHistory,
        correct: step.correct,
        attempts: step.attempts
      };
    });
    
    return {
      systemPrompt: `You are an expert language learning analyst. Your task is to evaluate a student's performance in a language lesson and provide comprehensive feedback.
      
      Analyze each step of the lesson, considering:
      1. Accuracy - how correctly the student responded to exercises
      2. Pronunciation - quality of spoken responses (inferred from text)
      3. Grammar - proper sentence structure and form
      4. Vocabulary - appropriate word choice and breadth of vocabulary
      5. Overall performance - holistic assessment
      
      Identify specific strengths and areas for improvement based on patterns in the student's responses. 
      Provide a summary that is encouraging but honest, and suggest topics for future lessons that would help address any weaknesses.`,
      
      userPrompt: `Analyze the following completed language lesson and provide detailed feedback and metrics.
      
      Lesson focus: ${lesson.focusArea}
      Target skills: ${lesson.targetSkills.join(', ')}
      
      Steps with user responses:
      ${JSON.stringify(stepsWithResponses, null, 2)}
      
      Format your response as JSON:
      {
        "metrics": {
          "accuracy": number (0-100),
          "pronunciationScore": number (0-100),
          "grammarScore": number (0-100),
          "vocabularyScore": number (0-100),
          "overallScore": number (0-100),
          "strengths": [array of 2-4 specific strengths],
          "weaknesses": [array of 2-4 specific areas for improvement]
        },
        "summary": "A 2-3 sentence personalized summary of the student's performance",
        "nextLessonSuggestions": [array of 2-4 recommended lesson topics]
      }`
    };
  }
}

export default LessonGeneratorService;
