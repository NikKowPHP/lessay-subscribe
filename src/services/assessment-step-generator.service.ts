import { IAIService } from '@/interfaces/ai-service.interface';
import { models } from './ai.service';
import logger from '@/utils/logger';
import { retryOperation } from '@/utils/retryWithOperation';
// import { IAssessmentGeneratorService } from '@/lib/interfaces/all-interfaces';
import { MockAssessmentGeneratorService } from '@/__mocks__/generated-assessment-lessons.mock';
import { AssessmentStepType, ProficiencyLevel } from '@prisma/client';
import { IAssessmentGeneratorService } from '@/lib/interfaces/all-interfaces';

class AssessmentStepGeneratorService implements IAssessmentGeneratorService {
  private aiService: IAIService;
  private useMock: boolean;

  constructor(
    aiService: IAIService,
    useMock: boolean = process.env.NEXT_PUBLIC_MOCK_ASSESSMENT_GENERATOR === 'true'
  ) {
    this.aiService = aiService;
    this.useMock = useMock;
    logger.info('AssessmentGeneratorService initialized', { useMock });
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

    try {
      if (this.useMock) {
        logger.info('Using mock assessment generator');
        return MockAssessmentGeneratorService.generateAssessmentLesson(
          sourceLanguage,
          targetLanguage
        );
      }

      const prompts = this.generateAssessmentPrompts(
        targetLanguage,
        sourceLanguage,
        proficiencyLevel
      );

      logger.info('Generated prompts for assessment', { prompts });

      const aiResponse = await retryOperation(() =>
        this.aiService.generateContent(
          '', // No file URI needed
          prompts.userPrompt,
          prompts.systemPrompt,
          models.gemini_2_pro_exp
        )
      );

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
        content: step.content || "No content provided",
        contentAudioUrl: step.contentAudioUrl || null,
        translation: step.translation || null,
        expectedAnswer: step.expectedAnswer || null,
        expectedAnswerAudioUrl: step.expectedAnswerAudioUrl || null,
        maxAttempts: step.maxAttempts || 3,
        attempts: 0,
        correct: false,
        feedback: step.feedback || null
      }));
    } catch (error) {
      logger.error('Error formatting assessment response', { error, aiResponse });
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
        
        The assessment should have 8-10 steps including introduction and conclusion.`
    };
  }
}

export default AssessmentStepGeneratorService;