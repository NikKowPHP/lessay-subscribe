import { AssessmentStepType } from "@prisma/client";

export const MockAssessmentGeneratorService = {
  generateAssessmentLesson: async function(
    sourceLanguage: string = "English",
    targetLanguage: string = "German"
  ) {
    // Only support English to German for now
    if (sourceLanguage !== "English" || targetLanguage !== "German") {
      console.warn("Currently only English to German assessments are fully supported in mock data");
    }

      const asessmentLessonSteps =  [
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
          correct: false,
          feedback: "The correct way to introduce yourself in German is 'Hallo, ich heiße...' followed by your name."
        },
        {
          stepNumber: 3,
          type: AssessmentStepType.feedback,
          content: "Great job! Let's try another phrase.",
          contentAudioUrl: "/audio-test.mp3",
          maxAttempts: 1,
          attempts: 0,
          correct: false
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
          correct: false,
          feedback: "To ask where the bathroom is in German, you say 'Wo ist die Toilette?'"
        },
        {
          stepNumber: 5, 
          type: AssessmentStepType.question,
          content: "How would you order a coffee in German?",
          contentAudioUrl: "/audio-test.mp3",
          translation: "Wie bestellt man einen Kaffee auf Deutsch?",
          expectedAnswer: "Einen Kaffee, bitte.",
          expectedAnswerAudioUrl: "/audio-test.mp3",
          maxAttempts: 3,
          attempts: 0,
          correct: false,
          feedback: "To order a coffee in German, you can say 'Einen Kaffee, bitte.'"
        },
        {
          stepNumber: 6,
          type: AssessmentStepType.question,
          content: "How do you ask for the time in German?",
          contentAudioUrl: "/audio-test.mp3",
          translation: "Wie fragt man nach der Uhrzeit auf Deutsch?",
          expectedAnswer: "Wie spät ist es?",
          expectedAnswerAudioUrl: "/audio-test.mp3",
          maxAttempts: 3,
          attempts: 0,
          correct: false,
          feedback: "To ask for the time in German, you say 'Wie spät ist es?'"
        },
        {
          stepNumber: 7,
          type: AssessmentStepType.question,
          content: "How do you say 'I don't understand' in German?",
          contentAudioUrl: "/audio-test.mp3",
          translation: "Wie sagt man 'Ich verstehe nicht' auf Deutsch?",
          expectedAnswer: "Ich verstehe nicht.",
          expectedAnswerAudioUrl: "/audio-test.mp3",
          maxAttempts: 3,
          attempts: 0,
          correct: false,
          feedback: "To say you don't understand in German, you say 'Ich verstehe nicht.'"
        },
        {
          stepNumber: 8,
          type: AssessmentStepType.summary,
          content: "Great work on completing the assessment! Based on your responses, we'll create a personalized learning plan to help you improve your German skills.",
          contentAudioUrl: "/audio-test.mp3",
          maxAttempts: 1,
          attempts: 0,
          correct: false
        }
    ]

    console.log(`Generated assessment with ${asessmentLessonSteps.length} steps`);
    return asessmentLessonSteps;
  }
};

// Adding the IAssessmentGeneratorService interface to lib/interfaces/all-interfaces.ts
// You'll need to add this interface to your project:
/*
export interface IAssessmentGeneratorService {
  generateAssessmentLesson: (userId: string, sourceLanguage?: string, targetLanguage?: string) => Promise<any>;
}
*/