import { AssessmentLesson, AssessmentStepType } from "@prisma/client";

export const MockAssessmentGeneratorService = {
  generateAssessmentLesson: async function(
    sourceLanguage: string = "English",
    targetLanguage: string = "German"
  ) {
    // Only support English to German for now
    if (sourceLanguage !== "English" || targetLanguage !== "German") {
      console.warn("Currently only English to German assessments are fully supported in mock data");
    }

    const assessmentLessonSteps = [
      {
        stepNumber: 1,
        type: AssessmentStepType.instruction,
        content: "Welcome to your language assessment. I'll ask you a series of questions to evaluate your current knowledge of German. This will help me create a personalized learning plan for you. Let's begin!",
        contentAudioUrl: "/audio-test.mp3",
        maxAttempts: 1,
        attempts: 0,
        correct: false
      },
      {
        stepNumber: 2,
        type: AssessmentStepType.question,
        content: "How do you say 'Hello, my name is...' in German?",
        contentAudioUrl: "/audio-test.mp3",
        translation: "Wie sagt man 'Hallo, mein Name ist...' auf Deutsch?",
        expectedAnswer: "Hallo, ich heiße...",
        expectedAnswerAudioUrl: "/audio-test.mp3",
        maxAttempts: 3,
        attempts: 0,
        correct: false
      },
      {
        stepNumber: 3,
        type: AssessmentStepType.feedback,
        content: "Great job! You answered correctly. 'Hallo, ich heiße...' is how you introduce yourself in German. Let's try another phrase.",
        contentAudioUrl: "/audio-test.mp3",
        maxAttempts: 1,
        attempts: 0,
        correct: true
      },
      {
        stepNumber: 4,
        type: AssessmentStepType.question,
        content: "How do you ask 'Where is the bathroom?' in German?",
        contentAudioUrl: "/audio-test.mp3",
        translation: "Wie fragt man 'Wo ist die Toilette?' auf Deutsch?",
        expectedAnswer: "Wo ist die Toilette?",
        expectedAnswerAudioUrl: "/audio-test.mp3",
        maxAttempts: 3,
        attempts: 0,
        correct: false
      },
      {
        stepNumber: 5,
        type: AssessmentStepType.feedback,
        content: "Excellent! 'Wo ist die Toilette?' is the correct way to ask where the bathroom is in German. Now, let's move on to ordering.",
        contentAudioUrl: "/audio-test.mp3",
        maxAttempts: 1,
        attempts: 0,
        correct: true
      },
      {
        stepNumber: 6, 
        type: AssessmentStepType.question,
        content: "How would you order a coffee in German?",
        contentAudioUrl: "/audio-test.mp3",
        translation: "Wie bestellt man einen Kaffee auf Deutsch?",
        expectedAnswer: "Einen Kaffee, bitte.",
        expectedAnswerAudioUrl: "/audio-test.mp3",
        maxAttempts: 3,
        attempts: 0,
        correct: false
      },
      {
        stepNumber: 7,
        type: AssessmentStepType.feedback,
        content: "Perfect! 'Einen Kaffee, bitte' is exactly how you would order a coffee in German. Let's move on to asking about time.",
        contentAudioUrl: "/audio-test.mp3",
        maxAttempts: 1,
        attempts: 0,
        correct: true
      },
      {
        stepNumber: 8,
        type: AssessmentStepType.question,
        content: "How do you ask for the time in German?",
        contentAudioUrl: "/audio-test.mp3",
        translation: "Wie fragt man nach der Uhrzeit auf Deutsch?",
        expectedAnswer: "Wie spät ist es?",
        expectedAnswerAudioUrl: "/audio-test.mp3",
        maxAttempts: 3,
        attempts: 0,
        correct: false
      },
      {
        stepNumber: 9,
        type: AssessmentStepType.summary,
        content: "Great work on completing the assessment! Based on your responses, we'll create a personalized learning plan to help you improve your German skills.",
        contentAudioUrl: "/audio-test.mp3",
        maxAttempts: 1,
        attempts: 0,
        correct: false
      }
    ];

    console.log(`Generated assessment with ${assessmentLessonSteps.length} steps`);
    return {
      steps: assessmentLessonSteps,
      targetLanguage,
      sourceLanguage
    };
  }


  generateAssessmentResult: async function(
    assessmentLesson: AssessmentLesson,
    userResponse: string
  ) {
    return {
      
      userResponse
    };
  }
};

// Adding the IAssessmentGeneratorService interface to lib/interfaces/all-interfaces.ts
// You'll need to add this interface to your project:
/*
export interface IAssessmentGeneratorService {
  generateAssessmentLesson: (userId: string, sourceLanguage?: string, targetLanguage?: string) => Promise<any>;
}
*/