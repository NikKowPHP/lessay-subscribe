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
import * as fs from 'fs';
import * as path from 'path';

export interface IAssessmentGeneratorService {
  generateAssessmentSteps: (
    targetLanguage: string,
    sourceLanguage: string,
    proficiencyLevel: string
  ) => Promise<AssessmentStep[]>;
  generateAssessmentResult: (
    assessmentLesson: AssessmentLesson,
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
  private useAudioUploadMock: boolean;
  private ttsService: ITTS;
  private uploadFunction: (file: Buffer, filename: string, contentType: string) => Promise<string>;

  constructor(
    aiService: IAIService,
    ttsService: ITTS,
    uploadFunction: (file: Buffer, filename: string, contentType: string) => Promise<string>
  ) {
    this.aiService = aiService;
    this.useMock = process.env.NEXT_PUBLIC_MOCK_ASSESSMENT_GENERATOR ===
    'true';
    this.useAudioGeneratorMock = process.env.NEXT_PUBLIC_MOCK_AUDIO_GENERATOR ===
    'true';
    
    this.useAudioUploadMock = process.env.NEXT_PUBLIC_USE_AUDIO_UPLOAD_MOCK ===
    'true';
    // this.useAudioUploadMock = false;
    this.ttsService = ttsService;
    this.uploadFunction = uploadFunction;
    
    logger.info('AssessmentGeneratorService initialized', { 
      useMock: this.useMock, 
      useAudioGeneratorMock: this.useAudioGeneratorMock,
      useAudioUploadMock: this.useAudioUploadMock
    });
  }

  async generateAssessmentSteps(
    targetLanguage: string,
    sourceLanguage: string,
    proficiencyLevel: string
  ): Promise<any> {
    logger.info('Generating assessment lesson', {
      targetLanguage,
      sourceLanguage,
      proficiencyLevel,
    });

    if (!targetLanguage || !sourceLanguage || !proficiencyLevel) {
      throw new Error('Missing required parameters');
    }

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

        // aiResponse = await retryOperation(() =>
          aiResponse = await this.aiService.generateContent(
            '', // No file URI needed
            prompts.userPrompt,
            prompts.systemPrompt,
            models.gemini_2_0_flash
          )
        // );
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

  private getUserResponses(assessmentLesson: AssessmentLesson): { stepId: string; response: string; allResponses: string[] }[] {
    try {
      // Collect all user responses from the steps
      const userResponses = assessmentLesson.steps
        .filter(step => step.attempts > 0)
        .map(step => {
          // Get responses from history if available, otherwise use single response
          const responseHistory = step.userResponseHistory 
            ? (JSON.parse(step.userResponseHistory as string) as string[]) 
            : [];
            
          // Use the most recent response (either from history or the single field)
          const latestResponse = responseHistory.length > 0 
            ? responseHistory[responseHistory.length - 1] 
            : (step.userResponse || '');
            
          return {
            stepId: step.id,
            response: latestResponse,
            // Optionally include full history if needed by analysis
            allResponses: responseHistory.length > 0 ? responseHistory : (step.userResponse ? [step.userResponse] : [])
          };
        });

      logger.info('Collected user responses for analysis', { 
        responseCount: userResponses.length 
      });
      return userResponses;
    } catch (error) {
      logger.error('Error collecting user responses for analysis', { error });
      throw error;
    }
  }

  public async generateAssessmentResult(
    assessmentLesson: AssessmentLesson,
  ): Promise<AiAssessmentResultResponse> {
    try {
      if (this.useMock) {
        logger.info('Using mock assessment generator');
        let userResponse = 'test';
        return MockAssessmentGeneratorService.generateAssessmentResult(
          assessmentLesson,
          userResponse
        );
      }
      // getting user responses
      const userResponses = this.getUserResponses(assessmentLesson);



      const prompts = this.generateOnboardingAssessmentEvaluationPrompts(
        assessmentLesson.steps as AssessmentStep[],
        userResponses
      );

      logger.info('Generated assessment prompts ', { prompts });

      const aiResponse = await retryOperation(() =>
        this.aiService.generateContent(
          '', // No file URI needed
          prompts.userPrompt,
          prompts.systemPrompt,
          models.gemini_2_0_flash
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
          const audioBase64 =
            await MockAssessmentGeneratorService.generateAudioForStep(
              step.content,
              language
            );
          // Convert base64 string to Buffer
          const audioBuffer = Buffer.from(audioBase64, 'base64');
          
          if (this.useAudioUploadMock) {
            const audioFile = this.createAudioFile(audioBuffer, `content_step_${step.stepNumber}.mp3`);
            step.contentAudioUrl = await this.saveAudioLocally(audioFile, 'lessay/assessmentStep/audio');
          } else {
            step.contentAudioUrl = await this.uploadAudioFile(audioBuffer, 'lessay/assessmentStep/audio');
          }
          
          if (step.expectedAnswer) {
            const answerAudioBase64 =
              await MockAssessmentGeneratorService.generateAudioForStep(
                step.expectedAnswer!,
                language
              );
            const answerAudioBuffer = Buffer.from(answerAudioBase64, 'base64');
            
            if (this.useAudioUploadMock) {
              const audioFile = this.createAudioFile(answerAudioBuffer, `answer_step_${step.stepNumber}.mp3`);
              step.expectedAnswerAudioUrl = await this.saveAudioLocally(audioFile, 'lessay/assessmentStep/audio');
            } else {
              step.expectedAnswerAudioUrl = await this.uploadAudioFile(answerAudioBuffer, 'lessay/assessmentStep/audio');
            }
          }
        }
        logger.info('Mock assessment generated', { steps });
      } else {
        // Real implementation
        let voice: string;

        for (const step of steps) {
          // generate step content in native language
          voice = this.ttsService.getVoice(sourceLanguage, 'basic');
          logger.info('voice for source language content', voice);

          const audioBase64 = await retryOperation(() =>
            this.ttsService.synthesizeSpeech(step.content, sourceLanguage, voice)
          );
          
          // Convert base64 string to Buffer
          const audioBuffer = Buffer.from(audioBase64, 'base64');
          
          let contentAudioUrl: string;
          
          // Check if we should save locally or upload to Vercel Blob
          if (this.useAudioUploadMock) {
            const audioFile = this.createAudioFile(audioBuffer, `content_step_${step.stepNumber}.mp3`);
            contentAudioUrl = await this.saveAudioLocally(audioFile, 'lessay/assessmentStep/audio');
          } else {
            contentAudioUrl = await this.uploadAudioFile(audioBuffer, 'lessay/assessmentStep/audio');
          }
          
          logger.info('audio for content saved/uploaded', contentAudioUrl);
          step.contentAudioUrl = contentAudioUrl;

          // generate expected answer in target language
          if (step.expectedAnswer) {
            const voice = this.ttsService.getVoice(language, 'basic');
            const answerAudioBase64 = await retryOperation(() =>
              this.ttsService.synthesizeSpeech(
                step.expectedAnswer!,
                language,
                voice
              )
            );
            
            // Convert base64 string to Buffer
            const answerAudioBuffer = Buffer.from(answerAudioBase64, 'base64');
            
            let answerAudioUrl: string;
            
            // Check if we should save locally or upload to Vercel Blob
            if (this.useAudioUploadMock) {
              const audioFile = this.createAudioFile(answerAudioBuffer, `answer_step_${step.stepNumber}.mp3`);
              answerAudioUrl = await this.saveAudioLocally(audioFile, 'lessay/assessmentStep/audio');
            } else {
              answerAudioUrl = await this.uploadAudioFile(answerAudioBuffer, 'lessay/assessmentStep/audio');
            }
            
            logger.info('audio for expectedAnswer saved/uploaded', answerAudioUrl);
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
  
  // Helper method to save files locally in public folder
  private async saveAudioLocally(file: File, pathPrefix: string): Promise<string> {
    try {
      // Create the directory structure if it doesn't exist
      const publicDir = path.join(process.cwd(), 'public');
      const targetDir = path.join(publicDir, pathPrefix);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Generate a unique filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filePath = path.join(targetDir, filename);
      
      // Convert File to Buffer and save
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
      
      // Return the URL path that can be used in browser
      return `/${pathPrefix}/${filename}`;
    } catch (error) {
      logger.error('Error saving audio file locally', { error });
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
        language proficiency evaluation. Create an initial onboarding assessment that will help 
        determine a new user's proficiency level (beginner, intermediate, or advanced) and learning needs
        in ${targetLanguage}. The assessment should be welcoming and encouraging while still providing 
        accurate diagnostic information.
        
        The user's native language is ${sourceLanguage}. Design an assessment that progressively increases 
        in difficulty to identify their current skill level.`,

      userPrompt: `Create a welcoming onboarding language assessment for a new user learning ${targetLanguage} 
        with ${sourceLanguage} as their native language.
        
        The assessment should:
        1. Start with a friendly introduction explaining the purpose of the assessment
        2. Include 6-8 carefully selected questions that progressively increase in difficulty
        3. Cover fundamental language skills (vocabulary, grammar, comprehension, basic production)
        4. Be designed to accurately place users in beginner, intermediate, or advanced levels
        5. End with an encouraging message regardless of performance level
        
        Format the response as a JSON object with the following structure:
        {
          "steps": [
            {
              "stepNumber": 1,
              "type": "instruction",  // one of: instruction, question, feedback, summary
              "content": "Welcome message and instructions in ${sourceLanguage}",
              "translation": null,
              "expectedAnswer": null,
              "maxAttempts": 1,
              "feedback": null
            },
            {
              "stepNumber": 2,
              "type": "question",
              "content": "Basic level question in ${sourceLanguage}",
              "translation": "Translation in ${targetLanguage} if applicable",
              "expectedAnswer": "Expected answer in ${targetLanguage}",
              "maxAttempts": 3,
              "feedback": "Supportive feedback explaining the answer"
            },
            // Additional steps with progressively harder questions...
            {
              "stepNumber": 8,
              "type": "summary",
              "content": "Encouraging conclusion in ${sourceLanguage}",
              "translation": null,
              "expectedAnswer": null,
              "maxAttempts": 1,
              "feedback": null
            }
          ]
        }
        
        Ensure questions are clearly labeled by difficulty level (internally in the JSON via comments or description fields)
        so we can accurately determine the user's proficiency based on which questions they answer correctly.
        
        The assessment should be engaging, supportive, and provide a positive first experience while still 
        gathering accurate diagnostic information about the user's current language abilities.`
    };
  }

  // You can add this method to evaluate the onboarding assessment results
  private generateOnboardingAssessmentEvaluationPrompts(
    assessmentSteps: AssessmentStep[],
    userResponses: { stepId: string; response: string; allResponses: string[] }[]
  ): { userPrompt: string; systemPrompt: string } {
    return {
      systemPrompt: `You are an expert language assessment evaluator specializing in determining a user's 
        proficiency level and learning needs based on their responses to an onboarding assessment.
        
        Analyze the user's responses to determine:
        1. Their overall proficiency level (beginner, intermediate, or advanced)
        2. Their strengths and weaknesses
        3. Recommended learning topics based on their performance
        4. A supportive summary of their current abilities`,

      userPrompt: `Evaluate the following onboarding assessment responses and determine the user's proficiency level.
        
        Assessment steps:
        ${JSON.stringify(assessmentSteps, null, 2)}
        
        User responses:
        ${JSON.stringify(userResponses, null, 2)}
        
        Provide your evaluation in the following JSON format:
        {
          "metrics": {
            "accuracy": number,           // Overall percentage of correct answers
            "pronunciationScore": number, // Estimated pronunciation score based on complexity of responses
            "grammarScore": number,       // Grammar accuracy score
            "vocabularyScore": number,    // Vocabulary knowledge score
            "overallScore": number,       // Overall proficiency score
            "strengths": ["string"],      // List of identified strengths
            "weaknesses": ["string"]      // List of identified areas for improvement
          },
          "proficiencyLevel": "beginner|intermediate|advanced", // Determined level
          "proposedTopics": ["string"],   // 3-5 recommended topics for initial learning
          "summary": "string"             // Encouraging summary of results
        }
        
        Be supportive and encouraging in your assessment, focusing on the user's potential for growth
        while still providing an accurate proficiency assessment.`
    };
  }

  private async uploadAudioFile(audioBuffer: Buffer, pathPrefix: string): Promise<string> {
    if (this.useAudioUploadMock) {
      return `mock://${pathPrefix}/${Date.now()}.mp3`;
    }
    if (!this.uploadFunction) {
      throw new Error('Upload function not provided');
    }
    const filename = `${pathPrefix}/${Date.now()}.mp3`;
    return this.uploadFunction(audioBuffer, filename, 'audio/mpeg');
  }
}

export default AssessmentGeneratorService;
