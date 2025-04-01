import { IAIService } from '@/interfaces/ai-service.interface';
import { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
// import { IAssessmentGeneratorService } from '@/lib/interfaces/all-interfaces';
import { MockAssessmentGeneratorService } from '@/__mocks__/generated-assessment-lessons.mock';
import {
  AssessmentStep,
  AssessmentStepType,
  ProficiencyLevel,
} from '@prisma/client';
import { AssessmentLesson } from '@/models/AppAllModels.model';
import { ITTS } from '@/interfaces/tts.interface';

export interface IAssessmentGeneratorService {
  generateAssessmentSteps: (
    sourceLanguage?: string,
    targetLanguage?: string,
    proficiencyLevel?: string
  ) => Promise<AssessmentStep[]>;
  generateAssessmentResult: (
    assessmentLesson: AssessmentLesson,
    userResponse: string
  ) => Promise<AiAssessmentResultResponse>;
  generateAudioForSteps: (
    steps: AssessmentStep[],
    language: string,
    sourceLanguage: string
  ) => Promise<AssessmentStep[]>;
}

export interface AiAssessmentResultResponse {
  metrics: {
    accuracy: number;
    pronunciationScore: number;
    grammarScore: number;
    vocabularyScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  proposedTopics: string[];
  summary: string;
}

class AssessmentGeneratorService implements IAssessmentGeneratorService {
  private aiService: IAIService;
  private useMock: boolean;
  private useAudioGeneratorMock: boolean;
  private ttsService: ITTS;
  private uploadFunction: (file: File, pathPrefix: string) => Promise<string>;

  constructor(
    aiService: IAIService,
    ttsService: ITTS,
    uploadFunction?: (file: File, pathPrefix: string) => Promise<string>
  ) {
    this.aiService = aiService;
    this.useMock = process.env.NEXT_PUBLIC_MOCK_ASSESSMENT_GENERATOR ===
    'true';
    this.useAudioGeneratorMock = process.env.NEXT_PUBLIC_MOCK_AUDIO_GENERATOR ===
    'true';
    this.ttsService = ttsService;
    this.uploadFunction = uploadFunction || ((file, _) => Promise.resolve(URL.createObjectURL(file)));
    
    logger.info('AssessmentGeneratorService initialized', { useMock: this.useMock, useAudioGeneratorMock: this.useAudioGeneratorMock });
  }

  async generateAssessmentSteps(
    targetLanguage: string = 'German',
    sourceLanguage: string = 'English',
    proficiencyLevel: string = 'beginner'
  ): Promise<any> {
    logger.info('Generating assessment lesson', {
      targetLanguage,
      sourceLanguage,
      proficiencyLevel,
    });

    let aiResponse: Record<string, unknown> | Record<string, unknown>[] = [];
    try {
      if (this.useMock) {
        logger.info('Using mock assessment generator');
        const mockLesson =
          await MockAssessmentGeneratorService.generateAssessmentLesson(
            sourceLanguage,
            targetLanguage
          );
        logger.info('Mock assessment generated', { mockLesson });
        aiResponse = mockLesson;
      } else {
        const prompts = this.generateAssessmentPrompts(
          targetLanguage,
          sourceLanguage,
          proficiencyLevel
        );

        logger.info('Generated prompts for assessment', { prompts });

        aiResponse = await retryOperation(() =>
          this.aiService.generateContent(
            '', // No file URI needed
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_5_pro_exp
          )
        );
      }
      // TODO: add validation and try again if it fails

      logger.info('AI response received', { aiResponse });

      return this.formatAssessmentResponse(aiResponse);
    } catch (error) {
      logger.error('Error generating assessment:', {
        targetLanguage,
        sourceLanguage,
        proficiencyLevel,
        error,
      });
      throw error;
    }
  }

  public async generateAssessmentResult(
    assessmentLesson: AssessmentLesson,
    userResponse: string
  ): Promise<AiAssessmentResultResponse> {
    try {
      if (this.useMock) {
        logger.info('Using mock assessment generator');
        return MockAssessmentGeneratorService.generateAssessmentResult(
          assessmentLesson,
          userResponse
        );
      }

      const prompts = this.generateAssessmentResultPrompts(
        assessmentLesson,
        userResponse
      );

      logger.info('Generated assessment prompts ', { prompts });

      const aiResponse = await retryOperation(() =>
        this.aiService.generateContent(
          '', // No file URI needed
          prompts.userPrompt,
          prompts.systemPrompt,
          models.gemini_2_5_pro_exp
        )
      );

      logger.info('AI response received', { aiResponse });

      return this.constructAiAssessmentResultResponse(aiResponse);
    } catch (error) {
      logger.error('Error generating assessment:', {
        error,
      });
      throw error;
    }
  }

  public async generateAudioForSteps(
    steps: AssessmentStep[],
    language: string,
    sourceLanguage: string
  ): Promise<AssessmentStep[]> {
    logger.info('Generating audio for assessment lesson', {
      steps,
    });

    try {
      logger.info('useAudioGeneratorMock', this.useAudioGeneratorMock);
      if (this.useAudioGeneratorMock) {
        logger.info('Using mock audio generator because useAudioGeneratorMock is true', this.useAudioGeneratorMock);

        for (const step of steps) {
          const audio =
            await MockAssessmentGeneratorService.generateAudioForStep(
              step.content,
              language
            );
          step.contentAudioUrl = audio;
          if (step.expectedAnswer) {
            const audio =
              await MockAssessmentGeneratorService.generateAudioForStep(
                step.expectedAnswer!,
                language
              );
            step.expectedAnswerAudioUrl = audio;
          }
        }
        logger.info('Mock assessment generated', { steps });
      } else {
        // Real implementation
        let voice: string;

        for (const step of steps) {
          // generate step content in native language
          voice = this.ttsService.getVoice(sourceLanguage);
          logger.info('voice for source language content', voice);

          const audioBuffer = await retryOperation(() =>
            this.ttsService.synthesizeSpeech(step.content, sourceLanguage, voice)
          );
          
          // Create a File object from the audio buffer
          const contentAudioFile = this.createAudioFile(audioBuffer, `content_step_${step.stepNumber}.mp3`);
          
          // Upload to Vercel Blob
          const contentAudioUrl = await this.uploadFunction(contentAudioFile, 'lessay/assessmentStep/audio');
          
          logger.info('audio for content uploaded', contentAudioUrl);
          step.contentAudioUrl = contentAudioUrl;

          // generate expected answer in target language
          if (step.expectedAnswer) {
            const voice = this.ttsService.getVoice(language);
            const answerAudioBuffer = await retryOperation(() =>
              this.ttsService.synthesizeSpeech(
                step.expectedAnswer!,
                language,
                voice
              )
            );
            
            // Create a File object from the answer audio buffer
            const answerAudioFile = this.createAudioFile(answerAudioBuffer, `answer_step_${step.stepNumber}.mp3`);
            
            // Upload to Vercel Blob
            const answerAudioUrl = await this.uploadFunction(answerAudioFile, 'lessay/assessmentStep/audio');
            
            logger.info('audio for expectedAnswer uploaded', answerAudioUrl);
            step.expectedAnswerAudioUrl = answerAudioUrl;
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
  
  // Helper method to create a File from audio buffer
  private createAudioFile(audioBuffer: string | ArrayBuffer, filename: string): File {
    let blob: Blob;
    
    if (typeof audioBuffer === 'string') {
      // If it's a base64 string, convert it to a Blob
      const byteCharacters = atob(audioBuffer.split(',')[1]);
      const byteArrays = [];
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
      }
      blob = new Blob([new Uint8Array(byteArrays)], { type: 'audio/mp3' });
    } else {
      // If it's already an ArrayBuffer
      blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    }
    
    return new File([blob], filename, { type: 'audio/mp3' });
  }

  private constructAiAssessmentResultResponse(
    aiResponse: any
  ): AiAssessmentResultResponse {
    return {
      metrics: {
        accuracy: aiResponse.accuracy,
        pronunciationScore: aiResponse.pronunciationScore,
        grammarScore: aiResponse.grammarScore,
        vocabularyScore: aiResponse.vocabularyScore,
        overallScore: aiResponse.overallScore,
        strengths: aiResponse.strengths,
        weaknesses: aiResponse.weaknesses,
      },
      proposedTopics: aiResponse.proposedTopics,
      summary: aiResponse.summary,
    };
  }

  private formatAssessmentResponse(aiResponse: any): any[] {
    // Extract the steps array from the AI response
    // If we can't find it, return an empty array
    try {
      const data = aiResponse.data || aiResponse;
      const steps = data.steps || [];

      // Ensure all steps have required properties
      return steps.map((step: any, index: number) => ({
        stepNumber: step.stepNumber || index + 1,
        type: step.type || AssessmentStepType.question,
        content: step.content || 'No content provided',
        contentAudioUrl: step.contentAudioUrl || null,
        translation: step.translation || null,
        expectedAnswer: step.expectedAnswer || null,
        expectedAnswerAudioUrl: step.expectedAnswerAudioUrl || null,
        maxAttempts: step.maxAttempts || 3,
        attempts: 0,
        correct: false,
        feedback: step.feedback || null,
      }));
    } catch (error) {
      logger.error('Error formatting assessment response', {
        error,
        aiResponse,
      });
      return [];
    }
  }

  private generateAssessmentPrompts(
    targetLanguage: string,
    sourceLanguage: string,
    proficiencyLevel: string
  ): { userPrompt: string; systemPrompt: string } {
    return {
      systemPrompt: `You are an expert language assessment designer specializing in ${targetLanguage} 
        language proficiency evaluation. Create a comprehensive assessment for ${proficiencyLevel} level 
        learners whose native language is ${sourceLanguage}.`,

      userPrompt: `Create a language assessment to evaluate a ${proficiencyLevel} level student of ${targetLanguage}.
        The assessment should:
        1. Include a variety of question types (vocabulary, grammar, comprehension)
        2. Progress from simpler to more complex questions
        3. Test both recognition and production skills
        
        Format the response as JSON with an array of steps, each containing:
        - stepNumber: sequential number
        - type: one of [instruction, question, feedback, summary]
        - content: The text of the instruction/question
        - expectedAnswer: The correct answer (for question types)
        - maxAttempts: Maximum attempts allowed (usually 3)
        - feedback: Helpful feedback to provide after the student attempts the question
        
        The assessment should have 8-10 steps including introduction and conclusion.`,
    };
  }

  generateAssessmentResultPrompts(
    assessmentLesson: AssessmentLesson,
    userResponse: string
  ): { userPrompt: string; systemPrompt: string } {
    return {
      systemPrompt: `You are an expert language assessment designer specializing in ${assessmentLesson.targetLanguage} 
        language proficiency evaluation. Create a comprehensive assessment for  level 
        learners whose native language is ${assessmentLesson.sourceLanguage}.`,
      userPrompt: `Evaluate the student's response to the following assessment lesson:
        ${JSON.stringify(assessmentLesson)}
        The student's response is:
        ${userResponse}`,
    };
  }
}

export default AssessmentGeneratorService;
