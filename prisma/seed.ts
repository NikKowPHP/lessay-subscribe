import { ProficiencyLevel, LessonStepType, AssessmentStepType } from '@prisma/client'
// import prisma from '../src/lib/prisma.ts'
import prisma from '../src/lib/prisma.js';

async function main() {
  // Clear existing data in the correct order
  await prisma.lesson.deleteMany({}) // Delete lessons first
  await prisma.assessmentLesson.deleteMany({}) // Then delete assessment lessons
  await prisma.onboarding.deleteMany({}) // Then delete onboarding
  await prisma.user.deleteMany({}) // Finally delete users
  
  // Create test user (matching the mock auth service)
  const user = await prisma.user.create({
    data: {
      id: 'mock-user-id', // Use the same ID as in your mock auth service
      email: 'mock@example.com',
      name: 'Mock User',
    },
  })

  // Create onboarding data
  const onboarding = await prisma.onboarding.create({
    data: {
      userId: user.id,
      steps: {
        welcome: true,
        purpose: true,
        languages: true,
        proficiency: false
      },
      completed: false,
      learningPurpose: '',
      nativeLanguage: '',
      targetLanguage: '',
      proficiencyLevel: null,
      initialAssessmentCompleted: false,
    },
  })

  // Create single assessment lesson with multiple steps
  const assessmentLesson = await prisma.assessmentLesson.create({
    data: {
      userId: user.id,
      description: "Comprehensive language assessment to evaluate your current German knowledge and skills",
      completed: false,
      sourceLanguage: onboarding.nativeLanguage || "English",
      targetLanguage: onboarding.targetLanguage || "German",
      metrics: {
        accuracy: 0,
        pronunciationScore: 0,
        grammarScore: 0,
        vocabularyScore: 0,
        overallScore: 0,
        strengths: [],
        weaknesses: []
      },
      proposedTopics: ["Basic Greetings", "Restaurant Vocabulary", "Travel Essentials"],
      summary: null, // Will be filled after assessment completion
      steps: {
        create: [
          {
            stepNumber: 1,
            type: AssessmentStepType.instruction,
            content: "Welcome to your language assessment. I'll ask you a series of questions to evaluate your current knowledge of German. This will help me create a personalized learning plan for you. Let's begin!",
            maxAttempts: 1, // Instructions don't need attempts
            attempts: 0,
            correct: false
          },
          {
            stepNumber: 2,
            type: AssessmentStepType.question,
            content: "How do you say 'Hello, my name is...' in German?",
            expectedAnswer: "Hallo, ich heiße...",
            expectedAnswerAudioUrl: "https://example.com/audio/german/hallo_ich_heisse.mp3",
            maxAttempts: 3,
            attempts: 0,
            correct: false,
            feedback: "The correct way to introduce yourself in German is 'Hallo, ich heiße...' followed by your name."
          },
          {
            stepNumber: 3,
            type: AssessmentStepType.feedback,
            content: "Great job! Let's try another phrase.",
            maxAttempts: 1,
            attempts: 0,
            correct: false
          },
          {
            stepNumber: 4,
            type: AssessmentStepType.question,
            content: "How do you ask 'Where is the bathroom?' in German?",
            expectedAnswer: "Wo ist die Toilette?",
            expectedAnswerAudioUrl: "https://example.com/audio/german/wo_ist_die_toilette.mp3",
            maxAttempts: 3,
            attempts: 0,
            correct: false,
            feedback: "To ask where the bathroom is in German, you say 'Wo ist die Toilette?'"
          },
          {
            stepNumber: 5, 
            type: AssessmentStepType.question,
            content: "How would you order a coffee in German?",
            expectedAnswer: "Einen Kaffee, bitte.",
            expectedAnswerAudioUrl: "https://example.com/audio/german/einen_kaffee_bitte.mp3",
            maxAttempts: 3,
            attempts: 0,
            correct: false,
            feedback: "To order a coffee in German, you can say 'Einen Kaffee, bitte.'"
          },
          {
            stepNumber: 6,
            type: AssessmentStepType.question,
            content: "How do you ask for the time in German?",
            expectedAnswer: "Wie spät ist es?",
            expectedAnswerAudioUrl: "https://example.com/audio/german/wie_spat_ist_es.mp3",
            maxAttempts: 3,
            attempts: 0,
            correct: false,
            feedback: "To ask for the time in German, you say 'Wie spät ist es?'"
          },
          {
            stepNumber: 7,
            type: AssessmentStepType.question,
            content: "How do you say 'I don't understand' in German?",
            expectedAnswer: "Ich verstehe nicht.",
            expectedAnswerAudioUrl: "https://example.com/audio/german/ich_verstehe_nicht.mp3",
            maxAttempts: 3,
            attempts: 0,
            correct: false,
            feedback: "When you don't understand something in German, you can say 'Ich verstehe nicht.'"
          },
          {
            stepNumber: 8,
            type: AssessmentStepType.summary,
            content: "Thank you for completing your language assessment. Based on your responses, I'll create a personalized learning plan for you. Your results will help me identify the most effective lessons to improve your German skills.",
            maxAttempts: 1,
            attempts: 0,
            correct: false
          }
        ]
      }
    },
    include: {
      steps: true
    }
  });

  // Create regular lessons - Lesson 1: Greetings and Introductions
  const lesson1 = await prisma.lesson.create({
    data: {
      userId: user.id,
      lessonId: 'greetings-intro',
      focusArea: 'Greetings and Introductions',
      targetSkills: ['Basic Greetings', 'Self-Introduction', 'Polite Phrases'],
      performanceMetrics: {
        accuracy: 0,
        pronunciationScore: 0,
        errorPatterns: []
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            type: LessonStepType.new_word,
            content: 'Hallo',
            contentAudioUrl: 'https://example.com/audio/german/hallo.mp3',
            translation: 'Hello',
            expectedAnswer: 'Hallo',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/hallo.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 2,
            type: LessonStepType.new_word,
            content: 'Guten Tag',
            contentAudioUrl: 'https://example.com/audio/german/guten_tag.mp3',
            translation: 'Good day',
            expectedAnswer: 'Guten Tag',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/guten_tag.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 3,
            type: LessonStepType.new_word,
            content: 'Auf Wiedersehen',
            contentAudioUrl: 'https://example.com/audio/german/auf_wiedersehen.mp3',
            translation: 'Goodbye',
            expectedAnswer: 'Auf Wiedersehen',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/auf_wiedersehen.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'How do you introduce yourself in German saying "My name is John"?',
            contentAudioUrl: null,
            translation: 'Ich heiße John',
            expectedAnswer: 'Ich heiße John',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_heisse_john.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 5,
            type: LessonStepType.model_answer,
            content: 'Great job! Now let\'s learn how to ask someone\'s name.',
            contentAudioUrl: null,
            translation: null,
            expectedAnswer: null,
            expectedAnswerAudioUrl: null,
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 6,
            type: LessonStepType.new_word,
            content: 'Wie heißt du?',
            contentAudioUrl: 'https://example.com/audio/german/wie_heisst_du.mp3',
            translation: 'What is your name?',
            expectedAnswer: 'Wie heißt du',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/wie_heisst_du.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          }
        ]
      },
      completed: false
    },
    include: {
      steps: true
    }
  })

  // Lesson 2: Restaurant Phrases
  const lesson2 = await prisma.lesson.create({
    data: {
      userId: user.id,
      lessonId: 'restaurant-basics',
      focusArea: 'Restaurant Vocabulary',
      targetSkills: ['Ordering Food', 'Table Requests', 'Payment Phrases'],
      performanceMetrics: {
        accuracy: 0,
        pronunciationScore: 0,
        errorPatterns: []
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            type: LessonStepType.new_word,
            content: 'Speisekarte',
            contentAudioUrl: 'https://example.com/audio/german/speisekarte.mp3',
            translation: 'Menu',
            expectedAnswer: 'Speisekarte',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/speisekarte.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 2,
            type: LessonStepType.prompt,
            content: 'How do you ask "Can I have the menu, please?" in German?',
            contentAudioUrl: null,
            translation: 'Kann ich bitte die Speisekarte haben?',
            expectedAnswer: 'Kann ich bitte die Speisekarte haben',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/kann_ich_bitte_speisekarte.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 3,
            type: LessonStepType.new_word,
            content: 'Ich möchte bestellen',
            contentAudioUrl: 'https://example.com/audio/german/ich_moechte_bestellen.mp3',
            translation: 'I would like to order',
            expectedAnswer: 'Ich möchte bestellen',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_moechte_bestellen.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'How would you say "The check, please" in German?',
            contentAudioUrl: null,
            translation: 'Die Rechnung, bitte',
            expectedAnswer: 'Die Rechnung, bitte',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/die_rechnung_bitte.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 5,
            type: LessonStepType.model_answer,
            content: 'Excellent! Now try ordering a specific item.',
            contentAudioUrl: null,
            translation: null,
            expectedAnswer: null,
            expectedAnswerAudioUrl: null,
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 6,
            type: LessonStepType.new_word,
            content: 'Ein Wasser, bitte',
            contentAudioUrl: 'https://example.com/audio/german/ein_wasser_bitte.mp3',
            translation: 'A water, please',
            expectedAnswer: 'Ein Wasser, bitte',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ein_wasser_bitte.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          }
        ]
      },
      completed: false
    },
    include: {
      steps: true
    }
  })

  // Lesson 3: Travel Basics
  const lesson3 = await prisma.lesson.create({
    data: {
      userId: user.id,
      lessonId: 'travel-basics',
      focusArea: 'Travel Essentials',
      targetSkills: ['Asking for Directions', 'Public Transport', 'Booking Accommodation'],
      performanceMetrics: {
        accuracy: 0,
        pronunciationScore: 0,
        errorPatterns: []
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            type: LessonStepType.new_word,
            content: 'Wo ist...?',
            contentAudioUrl: 'https://example.com/audio/german/wo_ist.mp3',
            translation: 'Where is...?',
            expectedAnswer: 'Wo ist',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/wo_ist.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 2,
            type: LessonStepType.practice,
            content: 'How do you ask "How do I get to the train station?" in German?',
            contentAudioUrl: null,
            translation: 'Wie komme ich zum Bahnhof?',
            expectedAnswer: 'Wie komme ich zum Bahnhof',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/wie_komme_ich_zum_bahnhof.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 3,
            type: LessonStepType.new_word,
            content: 'Der Zug',
            contentAudioUrl: 'https://example.com/audio/german/der_zug.mp3',
            translation: 'The train',
            expectedAnswer: 'Der Zug',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/der_zug.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 4,
            type: LessonStepType.new_word,
            content: 'Der Bus',
            contentAudioUrl: 'https://example.com/audio/german/der_bus.mp3',
            translation: 'The bus',
            expectedAnswer: 'Der Bus',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/der_bus.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 5,
            type: LessonStepType.practice,
            content: 'How would you ask "When does the next bus come?" in German?',
            contentAudioUrl: null,
            translation: 'Wann kommt der nächste Bus?',
            expectedAnswer: 'Wann kommt der nächste Bus',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/wann_kommt_der_naechste_bus.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          }
        ]
      },
      completed: false
    },
    include: {
      steps: true
    }
  })

  console.log(`Created user: ${user.email}`)
  console.log(`Created onboarding for user: ${onboarding.id}`)
  console.log(`Created assessment lesson with ${assessmentLesson.steps.length} steps`)
  console.log(`Created lesson 1: ${lesson1.focusArea} with ${lesson1.steps.length} steps`)
  console.log(`Created lesson 2: ${lesson2.focusArea} with ${lesson2.steps.length} steps`)
  console.log(`Created lesson 3: ${lesson3.focusArea} with ${lesson3.steps.length} steps`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
