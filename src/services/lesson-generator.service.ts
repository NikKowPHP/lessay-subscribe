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
import { AdaptiveLessonGenerationRequest } from '@/models/AppAllModels.model';

export interface ILessonGeneratorService {
  generateLesson: (
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string,
    adaptiveRequest?: AdaptiveLessonGenerationRequest
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
  private useLessonGeneratorMock: boolean;
  private useAudioGeneratorMock: boolean;
  private useAudioUploadMock: boolean;
  private ttsService: ITTS;
  private uploadFunction: (
    file: Buffer,
    filename: string,
    contentType: string
  ) => Promise<string>;

  constructor(
    aiService: IAIService,
    ttsService: ITTS,
    uploadFunction: (
      file: Buffer,
      filename: string,
      contentType: string
    ) => Promise<string>
  ) {
    this.aiService = aiService;
    this.ttsService = ttsService;
    this.uploadFunction = uploadFunction;

    this.useLessonGeneratorMock =
      process.env.NEXT_PUBLIC_MOCK_LESSON_GENERATOR === 'true';
    // this.useLessonGeneratorMock = false;
    this.useAudioGeneratorMock =
      process.env.NEXT_PUBLIC_MOCK_AUDIO_GENERATOR === 'true';
    this.useAudioUploadMock =
      process.env.NEXT_PUBLIC_USE_AUDIO_UPLOAD_MOCK === 'true';
    logger.info('LessonGeneratorService initialized', {
      useLessonGeneratorMock: this.useLessonGeneratorMock,
      useAudioGeneratorMock: this.useAudioGeneratorMock,
      useAudioUploadMock: this.useAudioUploadMock,
    });
  }

  async generateLesson(
    topic: string,
    targetLanguage: string,
    difficultyLevel: string,
    sourceLanguage: string,
    adaptiveRequest?: AdaptiveLessonGenerationRequest
  ): Promise<Record<string, unknown>> {
    // Derive effective values from adaptive request
    const effectiveTopic = adaptiveRequest?.focusTopic || topic;
    const effectiveTargetLanguage =
      adaptiveRequest?.userInfo?.targetLanguage || targetLanguage;
    const effectiveSourceLanguage =
      adaptiveRequest?.userInfo?.nativeLanguage || sourceLanguage;
    const effectiveDifficulty =
      adaptiveRequest?.overallProgress?.estimatedProficiencyLevel ||
      adaptiveRequest?.userInfo?.proficiencyLevel ||
      difficultyLevel;

    logger.info('Generating adaptive lesson', {
      effectiveTopic,
      effectiveTargetLanguage,
      effectiveSourceLanguage,
      effectiveDifficulty,
      hasProgressData: !!adaptiveRequest?.overallProgress,
      hasAudioAnalysis: !!adaptiveRequest?.detailedAudioAnalysis,
    });

    // Generate prompts with full adaptive context
    const prompts = this.generateLessonPrompts(
      effectiveTopic,
      effectiveTargetLanguage,
      effectiveSourceLanguage,
      effectiveDifficulty,
      adaptiveRequest
    );

    let aiResponse: Record<string, unknown> | Record<string, unknown>[] = [];
    try {
      if (this.useLessonGeneratorMock) {
        logger.info('Using mock lesson generator for topic:', effectiveTopic);
        const mockLesson = await MockLessonGeneratorService.generateLesson(
          effectiveTopic,
          effectiveTargetLanguage,
          effectiveDifficulty
        );
        logger.info('Mock lesson generated', { effectiveTopic, mockLesson });
        aiResponse = mockLesson;
      } else {
        logger.info('Generated prompts for lesson', { prompts });

        aiResponse = await retryOperation(() =>
          this.aiService.generateContent(
            '', // No file URI needed
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_0_flash
          )
        );
        logger.info('AI response received for lesson generation', {
          aiResponse,
        });
      }

      const lessonsArray = Array.isArray(aiResponse)
        ? aiResponse
        : [aiResponse];

      try {
        lessonsArray.map((lesson) => this.validateLessonsResponse(lesson));
      } catch (error) {
        logger.error('Error validating lessons response:', { error });
        if (!this.useLessonGeneratorMock) {
          aiResponse = await retryOperation(() =>
            this.aiService.generateContent(
              '', // No file URI needed
              prompts.userPrompt,
              prompts.systemPrompt,
              models.gemini_2_0_flash
            )
          );
          logger.info('AI response received for lesson generation', {
            aiResponse,
          });
        }
      }

      const generatedLessons = lessonsArray.map((lesson) =>
        this.formatLessonResponse(lesson)
      );
      logger.info('Formatted lessons', { generatedLessons });

      return { data: generatedLessons };
    } catch (error) {
      logger.error('Error generating lesson:', {
        effectiveTopic,
        effectiveTargetLanguage,
        effectiveDifficulty,
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
          const audioBase64 =
            await MockLessonGeneratorService.generateAudioForStep(
              step.content,
              language
            );
          const audioBuffer = Buffer.from(audioBase64, 'base64');

          if (this.useAudioUploadMock) {
            const audioFile = this.createAudioFile(
              audioBuffer,
              `content_step_${step.stepNumber}.mp3`
            );
            step.contentAudioUrl = await this.saveAudioLocally(
              audioFile,
              'lessay/lessonStep/audio'
            );
          } else {
            step.contentAudioUrl = await this.uploadFunction(
              audioBuffer,
              `content_step_${step.stepNumber}.mp3`,
              'audio/mp3'
            );
          }

          if (step.expectedAnswer) {
            const answerAudioBase64 =
              await MockLessonGeneratorService.generateAudioForStep(
                step.expectedAnswer!,
                language
              );
            const answerAudioBuffer = Buffer.from(answerAudioBase64, 'base64');

            if (this.useAudioUploadMock) {
              const audioFile = this.createAudioFile(
                answerAudioBuffer,
                `answer_step_${step.stepNumber}.mp3`
              );
              step.expectedAnswerAudioUrl = await this.saveAudioLocally(
                audioFile,
                'lessay/lessonStep/audio'
              );
            } else {
              step.expectedAnswerAudioUrl = await this.uploadFunction(
                answerAudioBuffer,
                `answer_step_${step.stepNumber}.mp3`,
                'audio/mp3'
              );
            }
          }
        }
        logger.info('Mock audio generated', { steps });
      } else {
        // Real implementation
        for (const step of steps) {
          // Generate content audio in source language
          const contentVoice = this.ttsService.getVoice(
            sourceLanguage,
            'basic'
          );
          const contentAudioBase64 = await retryOperation(() =>
            this.ttsService.synthesizeSpeech(
              step.content,
              sourceLanguage,
              contentVoice
            )
          );
          const contentAudioBuffer = Buffer.from(contentAudioBase64, 'base64');

          if (this.useAudioUploadMock) {
            const contentFile = this.createAudioFile(
              contentAudioBuffer,
              `content_step_${step.stepNumber}.mp3`
            );
            step.contentAudioUrl = await this.saveAudioLocally(
              contentFile,
              'lessay/lessonStep/audio'
            );
          } else {
            step.contentAudioUrl = await this.uploadFunction(
              contentAudioBuffer,
              `content_step_${step.stepNumber}.mp3`,
              'audio/mp3'
            );
          }

          // Generate expected answer audio in target language if exists
          if (step.expectedAnswer) {
            const answerVoice = this.ttsService.getVoice(language, 'basic');
            const answerAudioBase64 = await retryOperation(() =>
              this.ttsService.synthesizeSpeech(
                step.expectedAnswer!,
                language,
                answerVoice
              )
            );
            const answerAudioBuffer = Buffer.from(answerAudioBase64, 'base64');

            if (this.useAudioUploadMock) {
              const answerFile = this.createAudioFile(
                answerAudioBuffer,
                `answer_step_${step.stepNumber}.mp3`
              );
              step.expectedAnswerAudioUrl = await this.saveAudioLocally(
                answerFile,
                'lessay/lessonStep/audio'
              );
            } else {
              step.expectedAnswerAudioUrl = await this.uploadFunction(
                answerAudioBuffer,
                `answer_step_${step.stepNumber}.mp3`,
                'audio/mp3'
              );
            }
          }
        }
      }
      return steps;
    } catch (error) {
      logger.error('Error generating audio for lesson:', { error });
      throw error;
    }
  }

  private async saveAudioLocally(
    file: File,
    pathPrefix: string
  ): Promise<string> {
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

  // Helper method to create a File from audio buffer
  private createAudioFile(
    audioBuffer: string | Buffer | ArrayBuffer, // Updated to also accept Buffer
    filename: string
  ): File {
    let blob: Blob;

    // If the audioBuffer is a Node.js Buffer, convert it to an ArrayBuffer before proceeding.
    if (typeof audioBuffer !== 'string' && Buffer.isBuffer(audioBuffer)) {
      audioBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      ) as ArrayBuffer;
    }

    logger.info(
      'audioBuffer',
      typeof audioBuffer === 'string'
        ? audioBuffer.slice(0, 100)
        : 'ArrayBuffer received'
    );

    if (typeof audioBuffer === 'string') {
      // If it's a base64 string, convert it to a Blob using Buffer
      const base64Data = audioBuffer.includes(',')
        ? audioBuffer.split(',')[1] // Extract from data URL if necessary
        : audioBuffer;
      const buffer = Buffer.from(base64Data, 'base64');
      blob = new Blob([buffer], { type: 'audio/mp3' });
    } else {
      // If it's already an ArrayBuffer
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
    adaptiveRequest?: AdaptiveLessonGenerationRequest
  ): { userPrompt: string; systemPrompt: string } {
    // Build context sections
    const contextSections = {
      overallProgress: this.buildOverallProgressContext(
        adaptiveRequest?.overallProgress
      ),
      performanceMetrics: this.buildPerformanceContext(
        adaptiveRequest?.performanceMetrics
      ),
      audioAnalysis: this.buildAudioAnalysisContext(
        adaptiveRequest?.detailedAudioAnalysis
      ),
      previousLesson: this.buildPreviousLessonContext(
        adaptiveRequest?.previousLesson
      ),
    };

    return {
      systemPrompt: this.buildSystemPrompt(
        targetLanguage,
        sourceLanguage,
        difficultyLevel,
        contextSections
      ),
      userPrompt: this.buildUserPrompt(
        topic,
        targetLanguage,
        sourceLanguage,
        difficultyLevel,
        contextSections
      ),
    };
  }

  private buildSystemPrompt(
    targetLanguage: string,
    sourceLanguage: string,
    difficultyLevel: string,
    contexts: { [key: string]: string }
  ): string {
    return `## ROLE: Expert Language Tutor & Lesson Designer (Voice-First)

You are an expert language tutor specializing in creating structured, pedagogically sound lessons for learning **${targetLanguage}**, designed for learners whose native language is **${sourceLanguage}**. The lessons will be delivered via a voice-based interface.

## CORE OBJECTIVE:

Generate a complete, single lesson focused on a specific topic, adhering strictly to the defined step structure and field requirements. The lesson should be appropriate for a **${difficultyLevel}** proficiency level and leverage the provided adaptive learning context.

## GUIDING PRINCIPLES & CONSTRAINTS:

1.  **Pedagogical Flow:** Lessons must follow a logical sequence: Introduction -> New Content/Vocabulary -> Practice -> Feedback -> Summary.
2.  **Voice-First Design:** All steps must be suitable for audio playback and voice responses (captured via Speech-to-Text). Phrasing must be clear and concise.
3.  **Strict Step Structure & Field Usage:** Adhere precisely to the defined \`LessonStepType\` and field requirements:
    *   **\`instruction\`**: Use for introductions, explanations, or transitions.
        *   \`content\`: The instruction text (primarily in **${sourceLanguage}**).
        *   \`translation\`: Should be \`null\`.
        *   \`expectedAnswer\`: Must be \`null\`.
        *   \`maxAttempts\`: 1.
    *   **\`new_word\`**: Use to introduce new vocabulary or short phrases.
        *   \`content\`: The new word/phrase in **${targetLanguage}**.
        *   \`translation\`: The meaning in **${sourceLanguage}**.
        *   \`expectedAnswer\`: The *same* word/phrase in **${targetLanguage}** (for repetition/pronunciation practice).
        *   \`maxAttempts\`: 3.
    *   **\`practice\` / \`prompt\`**: Use for exercises testing recall, application, or simple production.
        *   \`content\`: The question or instruction, usually in **${sourceLanguage}** (e.g., "How do you say X?", "Translate Y").
        *   \`translation\`: The **${targetLanguage}** translation of the \`content\` prompt.
        *   \`expectedAnswer\`: The *correct user response* in **${targetLanguage}**. This field is **mandatory** for these types.
        *   \`maxAttempts\`: 3.
    *   **\`feedback\`**: Use for brief, encouraging feedback after practice steps (can be positive or corrective).
        *   \`content\`: Feedback text (primarily in **${sourceLanguage}**).
        *   \`translation\`: Should be \`null\`.
        *   \`expectedAnswer\`: Must be \`null\`.
        *   \`maxAttempts\`: 1.
    *   **\`summary\`**: Use for concluding the lesson.
        *   \`content\`: Summary text (primarily in **${sourceLanguage}**).
        *   \`translation\`: Should be \`null\`.
        *   \`expectedAnswer\`: Must be \`null\`.
        *   \`maxAttempts\`: 1.
4.  **Adaptive Learning:** Use the provided context (overall progress, recent performance, audio analysis) to tailor the lesson content:
    *   Address identified weaknesses (grammar, vocab, pronunciation).
    *   Reinforce low-mastery topics/words.
    *   Adjust difficulty slightly based on trajectory and recent scores.
    *   Incorporate suggested focus areas or skill targets.
5.  **Language Usage:**
    *   Instructions, feedback, summaries, and practice prompts (\`content\`) should generally be in **${sourceLanguage}**.
    *   New words (\`content\`) and expected answers (\`expectedAnswer\`) must be in **${targetLanguage}**.
    *   Translations (\`translation\`) must be accurate and relevant.
6.  **Output Format:** Generate a **single, valid JSON object** representing the lesson, strictly following the specified format in the user prompt. Ensure all required fields are present and correctly typed for each step.

## PROVIDED ADAPTIVE CONTEXT (Use this to personalize the lesson):

${contexts.overallProgress || 'Overall Progress: No specific data provided.'}
${
  contexts.performanceMetrics ||
  'Recent Performance: No specific data provided.'
}
${contexts.audioAnalysis || 'Audio Analysis: No specific data provided.'}
${contexts.previousLesson || 'Previous Lesson: No specific data provided.'}
`;
  }

  private buildUserPrompt(
    topic: string,
    targetLanguage: string,
    sourceLanguage: string,
    difficultyLevel: string,
    contexts: { [key: string]: string }
  ): string {
    return `## TASK: Generate an Adaptive Language Lesson

    Create a complete, structured language lesson focused on the topic: **"${topic}"**.
    The lesson is for a **${difficultyLevel}** learner of **${targetLanguage}** whose native language is **${sourceLanguage}**.
    
    **INSTRUCTIONS:**
    
    1.  **Use Adaptive Context:** Personalize the lesson content based on the provided context below. Focus on addressing weaknesses and reinforcing learning goals.
    2.  **Structure (5-8 Steps):** Follow a standard pedagogical flow:
        *   Start with an \`instruction\` step (intro).
        *   Introduce new concepts/vocabulary using \`new_word\` steps.
        *   Include several \`practice\` or \`prompt\` steps for active recall and application.
        *   Provide brief \`feedback\` steps after some practice steps.
        *   End with a \`summary\` step.
    3.  **Strict Field Requirements:**
        *   **\`instruction\` / \`feedback\` / \`summary\`**: \`content\` in ${sourceLanguage}, \`expectedAnswer\` must be \`null\`, \`maxAttempts\` = 1.
        *   **\`new_word\`**: \`content\` in ${targetLanguage}, \`translation\` in ${sourceLanguage}, \`expectedAnswer\` = \`content\` (for repetition), \`maxAttempts\` = 3.
        *   **\`practice\` / \`prompt\`**: \`content\` (question/instruction) in ${sourceLanguage}, \`translation\` (prompt in ${targetLanguage}), \`expectedAnswer\` (correct user response in ${targetLanguage}) **is mandatory**, \`maxAttempts\` = 3.
    4.  **Content:** Ensure content is relevant to the topic, appropriate for the difficulty level, and addresses points from the adaptive context if applicable.
    5.  **Voice-First:** Keep text concise and clear for audio delivery and voice input.
    
    **ADAPTIVE CONTEXT FOR THIS LESSON:**
    ${
      contexts.overallProgress || 'Overall Progress: No specific data provided.'
    }
    ${
      contexts.performanceMetrics ||
      'Recent Performance: No specific data provided.'
    }
    ${contexts.audioAnalysis || 'Audio Analysis: No specific data provided.'}
    ${contexts.previousLesson || 'Previous Lesson: No specific data provided.'}
    
    **OUTPUT FORMAT (Single JSON Object):**
    
    Generate a **single, valid JSON object** containing the lesson structure. Adhere strictly to this format:
    
    \`\`\`json
    {
      "focusArea": "Lesson Topic (e.g., ${topic})",
      "targetSkills": ["Skill 1", "Skill 2", "..."], // List skills addressed
      "steps": [
        {
          "stepNumber": 1,
          "type": "instruction", // Must be one of: instruction, new_word, practice, prompt, feedback, summary
          "content": "Instruction text in ${sourceLanguage}...",
          "translation": null, // Should be null for instruction/feedback/summary
          "expectedAnswer": null, // MUST be null for instruction/feedback/summary
          "maxAttempts": 1 // Should be 1 for instruction/feedback/summary
        },
        {
          "stepNumber": 2,
          "type": "new_word",
          "content": "WordIn${targetLanguage}",
          "translation": "MeaningIn${sourceLanguage}",
          "expectedAnswer": "WordIn${targetLanguage}", // Same as content for repetition
          "maxAttempts": 3 // Should be 3 for new_word/practice/prompt
        },
        {
          "stepNumber": 3,
          "type": "practice", // or "prompt"
          "content": "Question or task in ${sourceLanguage}...",
          "translation": "Question or task translated to ${targetLanguage}",
          "expectedAnswer": "CorrectResponseIn${targetLanguage}", // MANDATORY for practice/prompt
          "maxAttempts": 3
        },
        {
          "stepNumber": 4,
          "type": "feedback",
          "content": "Feedback text in ${sourceLanguage}...",
          "translation": null,
          "expectedAnswer": null, // MUST be null
          "maxAttempts": 1
        },
        // ... more steps (5-8 total) ...
        {
          "stepNumber": 7, // Example final step
          "type": "summary",
          "content": "Summary text in ${sourceLanguage}...",
          "translation": null,
          "expectedAnswer": null, // MUST be null
          "maxAttempts": 1
        }
      ]
    }
    \`\`\`
    
    Ensure the generated JSON is valid and complete according to these instructions.
    `;
  }

  private buildOverallProgressContext(
    progress?: AdaptiveLessonGenerationRequest['overallProgress']
  ): string {
    if (!progress) return '';
    return `
        Overall Progress:
        - Proficiency: ${progress.estimatedProficiencyLevel}
        - Score: ${progress.overallScore || 'N/A'}
        - Trajectory: ${progress.learningTrajectory}
        - Strengths: ${progress.persistentStrengths.slice(0, 3).join(', ')}
        - Weaknesses: ${progress.persistentWeaknesses.slice(0, 3).join(', ')}
        - Low Mastery Topics: ${
          progress.lowMasteryTopics?.slice(0, 3).join(', ') || 'None'
        }
        - Vocabulary Needs: ${
          progress.lowMasteryWordsCount || 0
        } words needing practice`;
  }

  private buildPerformanceContext(
    metrics?: AdaptiveLessonGenerationRequest['performanceMetrics']
  ): string {
    if (!metrics) return '';
    return `
        Recent Performance:
        - Accuracy: ${metrics.avgAccuracy?.toFixed(0) || 'N/A'}%
        - Pronunciation: ${
          metrics.avgPronunciationScore?.toFixed(0) || 'N/A'
        }/100
        - Grammar: ${metrics.avgGrammarScore?.toFixed(0) || 'N/A'}/100
        - Vocabulary: ${metrics.avgVocabularyScore?.toFixed(0) || 'N/A'}/100
        - Top Strengths: ${metrics.strengths.slice(0, 2).join(', ') || 'None'}
        - Top Weaknesses: ${
          metrics.weaknesses.slice(0, 2).join(', ') || 'None'
        }`;
  }

  private buildAudioAnalysisContext(
    audio?: AdaptiveLessonGenerationRequest['detailedAudioAnalysis']
  ): string {
    if (!audio) return '';
    return `
        Audio Analysis:
        - Problematic Sounds: ${
          audio.problematicSounds.slice(0, 3).join(', ') || 'None'
        }
        - Grammar Focus: ${audio.grammarRulesToReview
          .slice(0, 2)
          .map((r) => `${r.rule} (${r.priority})`)
          .join(', ')}
        - Vocabulary Expansion: ${audio.vocabularyAreasForExpansion
          .slice(0, 2)
          .map(
            (v) => `${v.topic}: ${v.suggestedVocabulary.slice(0, 3).join(', ')}`
          )
          .join('; ')}
        - Suggested Focus: ${
          audio.nextSkillTargets.slice(0, 2).join(', ') || 'None'
        }`;
  }

  private buildPreviousLessonContext(
    lesson?: AdaptiveLessonGenerationRequest['previousLesson']
  ): string {
    if (!lesson) return '';
    return `
        Previous Lesson:
        - Focus: ${lesson.focusArea}
        - Skills: ${lesson.targetSkills.slice(0, 3).join(', ')}`;
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
      responseCount: userResponses.length,
    });

    const prompts = this.generateLessonCompletionPrompts(lesson, userResponses);

    try {
      let aiResponse;

      if (this.useLessonGeneratorMock) {
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
            weaknesses: ['Article usage', 'Verb conjugation in past tense'],
          },
          summary: `Good progress with ${lesson.focusArea}. You demonstrated solid understanding of the core concepts, though there are some areas to improve.`,
          nextLessonSuggestions: [
            'Grammar fundamentals',
            'Past tense expressions',
            'Everyday conversation',
          ],
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
        logger.info(
          'Generated real lesson completion results in not mocked mode',
          { aiResponse }
        );
      }

      return aiResponse;
    } catch (error) {
      logger.error('Error generating lesson completion results', { error });
      throw new Error('Failed to generate lesson completion analysis');
    }
  }

  private formatLessonCompletionResults(aiResponse: Record<string, unknown>): {
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
      nextLessonSuggestions: aiResponse.nextLessonSuggestions as string[],
    };
  }

  private generateLessonCompletionPrompts(
    lesson: LessonModel,
    userResponses: { stepId: string; response: string }[]
  ): { userPrompt: string; systemPrompt: string } {
    // Create a map of step ID to user response for easier lookup
    const responseMap = new Map(
      userResponses.map((item) => [item.stepId, item.response])
    );

    // Format steps with user responses for analysis
    const stepsWithResponses = lesson.steps.map((step) => {
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
        attempts: step.attempts,
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
      }`,
    };
  }
}

export default LessonGeneratorService;
