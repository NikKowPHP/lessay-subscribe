// import { AssessmentLesson, AssessmentStepType } from "@prisma/client";

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
  },

  generateAssessmentResult: async function(
    assessmentLesson: AssessmentLesson,
    userResponse: string
  ) {
    // Calculate mock scores
    const correctSteps = assessmentLesson.steps.filter(step => 
      step.type === AssessmentStepType.question && step.correct
    );
    const totalQuestions = assessmentLesson.steps.filter(step => 
      step.type === AssessmentStepType.question
    ).length;
    
    // Calculate a basic accuracy score based on how many questions were answered correctly
    const accuracy = totalQuestions > 0 ? (correctSteps.length / totalQuestions) * 100 : 70;
    
    // Generate random scores within reasonable ranges
    const pronunciationScore = Math.floor(Math.random() * 30) + 60; // 60-90
    const grammarScore = Math.floor(Math.random() * 30) + 60; // 60-90
    const vocabularyScore = Math.floor(Math.random() * 30) + 60; // 60-90
    
    // Overall score is an average of the other scores
    const overallScore = Math.floor((accuracy + pronunciationScore + grammarScore + vocabularyScore) / 4);
    
    // Create mock strengths and weaknesses based on the scores
    const strengths = [];
    const weaknesses = [];
    
    if (pronunciationScore > 75) strengths.push("Good pronunciation of basic phrases");
    else weaknesses.push("Pronunciation of certain words needs improvement");
    
    if (grammarScore > 75) strengths.push("Understanding of basic grammar structures");
    else weaknesses.push("Grammar usage in complex sentences");
    
    if (vocabularyScore > 75) strengths.push("Good grasp of essential vocabulary");
    else weaknesses.push("Limited vocabulary range");
    
    // Add some general strengths/weaknesses
    strengths.push("Willingness to communicate");
    if (Math.random() > 0.5) strengths.push("Good comprehension of simple phrases");
    
    weaknesses.push("Confidence in speaking");
    if (Math.random() > 0.5) weaknesses.push("Word order in questions");
    
    // Generate proposed topics based on target language
    const proposedTopics = [
      "Basic Greetings and Introductions",
      "Everyday Conversations",
      "Travel Vocabulary",
      "Food and Dining",
      "Shopping and Numbers"
    ];
    
    // Create a summary
    const summaryParts = [
      `Based on your assessment, you've demonstrated ${overallScore > 75 ? "good" : "basic"} proficiency in ${assessmentLesson.targetLanguage}.`,
      `Your strengths include ${strengths.slice(0, 2).join(" and ")}.`,
      `Areas for improvement include ${weaknesses.slice(0, 2).join(" and ")}.`,
      "We recommend starting with focused lessons on basic conversational phrases and gradually expanding your vocabulary."
    ];
    
    const summary = summaryParts.join(" ");
    
    return {
      metrics: {
        accuracy,
        pronunciationScore,
        grammarScore,
        vocabularyScore,
        overallScore,
        strengths,
        weaknesses
      },
      proposedTopics,
      summary
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