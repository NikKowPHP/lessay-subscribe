// import { ProficiencyLevel, LessonStepType, AssessmentStepType } from '@prisma/client'
// // import prisma from '../src/lib/prisma.ts'
// import prisma from '../src/lib/prisma.js';
// import { assessmentMockDataJson } from '../src/__mocks__/assessment-data.mock';

// async function main() {
//   // Clear existing data in the correct order
//   await prisma.lessonStep.deleteMany({}); // Delete lesson steps first
//   await prisma.lesson.deleteMany({}); // Then delete lessons
//   await prisma.assessmentStep.deleteMany({}); // Delete assessment steps
//   await prisma.assessmentLesson.deleteMany({}); // Then delete assessment lessons
//   await prisma.onboarding.deleteMany({}); // Then delete onboarding
//   await prisma.user.deleteMany({}); // Finally delete users

//   // Create test user (matching the mock auth service)
//   // const user = await prisma.user.create({
//   //   data: {
//   //     id: 'mock-user-id', // Use the same ID as in your mock auth service
//   //     email: 'mock@example.com',
//   //     name: 'Mock User',
//   //   },
//   // })

//   // Create onboarding data
//   // const onboarding = await prisma.onboarding.create({
//   //   data: {
//   //     userId: user.id,
//   //     steps: {
//   //       welcome: true,
//   //       purpose: false,
//   //       languages: false,
//   //       proficiency: false
//   //     },
//   //     completed: false,
//   //     // learningPurpose: 'Relocation',
//   //     // nativeLanguage: '',
//   //     // targetLanguage: '',
//   //     // proficiencyLevel: ProficiencyLevel.beginner,
//   //     initialAssessmentCompleted: false,
//   //   },
//   // })

//   // Create assessment lesson from mock data
//   // for (const assessmentData of assessmentMockDataJson) {
//   //   const assessmentLesson = await prisma.assessmentLesson.create({
//   //     data: {
//   //       id: assessmentData.id,
//   //       userId: user.id,
//   //       description: assessmentData.description,
//   //       completed: false,
//   //       sourceLanguage: assessmentData.sourceLanguage,
//   //       targetLanguage: assessmentData.targetLanguage,
//   //       metrics: assessmentData.metrics,
//   //       proposedTopics: assessmentData.proposedTopics,
//   //       summary: assessmentData.summary,
//   //       createdAt: new Date(assessmentData.createdAt),
//   //       updatedAt: new Date(assessmentData.updatedAt),
//   //       sessionRecordingUrl: assessmentData.sessionRecordingUrl,
//   //       steps: {
//   //         create: assessmentData.steps.map(step => ({
//   //           id: step.id,
//   //           stepNumber: step.stepNumber,
//   //           type: step.type as AssessmentStepType,
//   //           content: step.content,
//   //           contentAudioUrl: step.contentAudioUrl,
//   //           translation: step.translation,
//   //           expectedAnswer: step.expectedAnswer,
//   //           expectedAnswerAudioUrl: step.expectedAnswerAudioUrl,
//   //           maxAttempts: step.maxAttempts,
//   //           userResponse: null,
//   //           attempts: 0,
//   //           correct: false,
//   //           lastAttemptAt: null,
//   //           feedback: null,
//   //           createdAt: new Date(step.createdAt),
//   //           updatedAt: new Date(step.updatedAt)
//   //         }))
//   //       }
//   //     },
//   //   });

//   //   console.log(`Created assessment lesson: ${assessmentLesson.id} with ${assessmentData.steps.length} steps`);
//   // }

//   // Create regular lessons - Lesson 1: Greetings and Introductions
//   // const lesson1 = await prisma.lesson.create({
//   //   data: {
//   //     userId: user.id,
//   //     lessonId: 'greetings-intro',
//   //     focusArea: 'Greetings and Introductions',
//   //     targetSkills: ['Basic Greetings', 'Self-Introduction', 'Polite Phrases'],
//   //     performanceMetrics: {
//   //       accuracy: 0,
//   //       pronunciationScore: 0,
//   //       errorPatterns: []
//   //     },
//   //     steps: {
//   //       create: [
//   //         {
//   //           stepNumber: 1,
//   //           type: LessonStepType.instruction,
//   //           content: "Welcome to the 'Basic Greetings' lesson! In this lesson, you'll learn common German greetings and introductions.",
//   //           contentAudioUrl: 'https://example.com/audio/german/hallo.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 2,
//   //           type: LessonStepType.new_word,
//   //           content: 'Hallo',
//   //           contentAudioUrl: 'https://example.com/audio/german/hallo.mp3',
//   //           translation: 'Hello',
//   //           expectedAnswer: 'Hallo',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/hallo.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 3,
//   //           type: LessonStepType.new_word,
//   //           content: 'Guten Tag',
//   //           contentAudioUrl: 'https://example.com/audio/german/guten_tag.mp3',
//   //           translation: 'Good day',
//   //           expectedAnswer: 'Guten Tag',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/guten_tag.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 4,
//   //           type: LessonStepType.new_word,
//   //           content: 'Auf Wiedersehen',
//   //           contentAudioUrl: 'https://example.com/audio/german/auf_wiedersehen.mp3',
//   //           translation: 'Goodbye',
//   //           expectedAnswer: 'Auf Wiedersehen',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/auf_wiedersehen.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 5,
//   //           type: LessonStepType.practice,
//   //           content: 'How do you introduce yourself in German saying "My name is John"?',
//   //           contentAudioUrl: null,
//   //           translation: 'Ich heiße John',
//   //           expectedAnswer: 'Ich heiße John',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_heisse_john.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 6,
//   //           type: LessonStepType.model_answer,
//   //           content: 'Great job! Now let\'s learn how to ask someone\'s name.',
//   //           contentAudioUrl: null,
//   //           translation: null,
//   //           expectedAnswer: null,
//   //           expectedAnswerAudioUrl: null,
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 7,
//   //           type: LessonStepType.new_word,
//   //           content: 'Wie heißt du?',
//   //           contentAudioUrl: 'https://example.com/audio/german/wie_heisst_du.mp3',
//   //           translation: 'What is your name?',
//   //           expectedAnswer: 'Wie heißt du',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/wie_heisst_du.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 8,
//   //           type: LessonStepType.summary,
//   //           content: "Congratulations! You've completed the Basic Greetings lesson. You now know how to greet people and introduce yourself in German!",
//   //           contentAudioUrl: 'https://example.com/audio/german/congratulations.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         }
//   //       ]
//   //     },
//   //     completed: false
//   //   },
//   //   include: {
//   //     steps: true
//   //   }
//   // })

//   // Lesson 2: Restaurant Phrases
//   // const lesson2 = await prisma.lesson.create({
//   //   data: {
//   //     userId: user.id,
//   //     lessonId: 'restaurant-basics',
//   //     focusArea: 'Restaurant Vocabulary',
//   //     targetSkills: ['Ordering Food', 'Table Requests', 'Payment Phrases'],
//   //     performanceMetrics: {
//   //       accuracy: 0,
//   //       pronunciationScore: 0,
//   //       errorPatterns: []
//   //     },
//   //     steps: {
//   //       create: [
//   //         {
//   //           stepNumber: 1,
//   //           type: LessonStepType.instruction,
//   //           content: "Welcome to the 'Restaurant Phrases' lesson! In this lesson, you'll learn essential phrases for ordering food and drinks in German restaurants.",
//   //           contentAudioUrl: 'https://example.com/audio/german/congratulations.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 2,
//   //           type: LessonStepType.new_word,
//   //           content: 'Speisekarte',
//   //           contentAudioUrl: 'https://example.com/audio/german/speisekarte.mp3',
//   //           translation: 'Menu',
//   //           expectedAnswer: 'Speisekarte',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/speisekarte.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 3,
//   //           type: LessonStepType.prompt,
//   //           content: 'How do you ask "Can I have the menu, please?" in German?',
//   //           contentAudioUrl: null,
//   //           translation: 'Kann ich bitte die Speisekarte haben?',
//   //           expectedAnswer: 'Kann ich bitte die Speisekarte haben',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/kann_ich_bitte_speisekarte.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 4,
//   //           type: LessonStepType.new_word,
//   //           content: 'Ich möchte bestellen',
//   //           contentAudioUrl: 'https://example.com/audio/german/ich_moechte_bestellen.mp3',
//   //           translation: 'I would like to order',
//   //           expectedAnswer: 'Ich möchte bestellen',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_moechte_bestellen.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 5,
//   //           type: LessonStepType.practice,
//   //           content: 'How would you say "The check, please" in German?',
//   //           contentAudioUrl: null,
//   //           translation: 'Die Rechnung, bitte',
//   //           expectedAnswer: 'Die Rechnung, bitte',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/die_rechnung_bitte.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 6,
//   //           type: LessonStepType.model_answer,
//   //           content: 'Excellent! Now try ordering a specific item.',
//   //           contentAudioUrl: null,
//   //           translation: null,
//   //           expectedAnswer: null,
//   //           expectedAnswerAudioUrl: null,
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 7,
//   //           type: LessonStepType.new_word,
//   //           content: 'Ein Wasser, bitte',
//   //           contentAudioUrl: 'https://example.com/audio/german/ein_wasser_bitte.mp3',
//   //           translation: 'A water, please',
//   //           expectedAnswer: 'Ein Wasser, bitte',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/ein_wasser_bitte.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 8,
//   //           type: LessonStepType.summary,
//   //           content: "Great job! You've completed the Restaurant Phrases lesson. You're now ready to order food and drinks in German restaurants with confidence!",
//   //           contentAudioUrl: 'https://example.com/audio/german/congratulations.mp3',
//   //           attempts: 1,
//   //           correct: false,
//   //           errorPatterns: []
//   //         }
//   //       ]
//   //     },
//   //     completed: false
//   //   },
//   //   include: {
//   //     steps: true
//   //   }
//   // })

//   // Lesson 3: Travel Basics
//   // const lesson3 = await prisma.lesson.create({
//   //   data: {
//   //     userId: user.id,
//   //     lessonId: 'travel-basics',
//   //     focusArea: 'Travel Essentials',
//   //     targetSkills: ['Asking for Directions', 'Public Transport', 'Booking Accommodation'],
//   //     performanceMetrics: {
//   //       accuracy: 0,
//   //       pronunciationScore: 0,
//   //       errorPatterns: []
//   //     },
//   //     steps: {
//   //       create: [
//   //         {
//   //           stepNumber: 1,
//   //           type: LessonStepType.instruction,
//   //           content: "Welcome to the 'Travel Essentials' lesson! In this lesson, you'll learn key phrases for navigating public transportation and asking for directions in German.",
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 2,
//   //           type: LessonStepType.new_word,
//   //           content: 'Wo ist...?',
//   //           contentAudioUrl: 'https://example.com/audio/german/wo_ist.mp3',
//   //           translation: 'Where is...?',
//   //           expectedAnswer: 'Wo ist',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/wo_ist.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 3,
//   //           type: LessonStepType.practice,
//   //           content: 'How do you ask "How do I get to the train station?" in German?',
//   //           contentAudioUrl: null,
//   //           translation: 'Wie komme ich zum Bahnhof?',
//   //           expectedAnswer: 'Wie komme ich zum Bahnhof',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/wie_komme_ich_zum_bahnhof.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 4,
//   //           type: LessonStepType.new_word,
//   //           content: 'Der Zug',
//   //           contentAudioUrl: 'https://example.com/audio/german/der_zug.mp3',
//   //           translation: 'The train',
//   //           expectedAnswer: 'Der Zug',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/der_zug.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 5,
//   //           type: LessonStepType.practice,
//   //           content: 'How would you ask "When does the next bus come?" in German?',
//   //           contentAudioUrl: null,
//   //           translation: 'Wann kommt der nächste Bus?',
//   //           expectedAnswer: 'Wann kommt der nächste Bus',
//   //           expectedAnswerAudioUrl: 'https://example.com/audio/german/wann_kommt_der_naechste_bus.mp3',
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         },
//   //         {
//   //           stepNumber: 6,
//   //           type: LessonStepType.summary,
//   //           content: "Well done! You've completed the Travel Essentials lesson. You're now prepared to navigate German cities and use public transportation with ease!",
//   //           attempts: 0,
//   //           correct: false,
//   //           errorPatterns: []
//   //         }
//   //       ]
//   //     },
//   //     completed: false
//   //   },
//   //   include: {
//   //     steps: true
//   //   }
//   // })

//   // console.log(`Created user: ${user.email}`)
//   // console.log(`Created onboarding for user: ${onboarding.id}`)
//   // console.log(`Created assessment lesson with ${assessmentLesson.steps.length} steps`)
//   // console.log(`Created lesson 1: ${lesson1.focusArea} with ${lesson1.steps.length} steps`)
//   // console.log(`Created lesson 2: ${lesson2.focusArea} with ${lesson2.steps.length} steps`)
//   // console.log(`Created lesson 3: ${lesson3.focusArea} with ${lesson3.steps.length} steps`)
// }

// main()
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })
