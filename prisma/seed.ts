import { ProficiencyLevel, LessonStepType } from '@prisma/client'
import prisma from '../src/lib/prisma'

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
        welcome: false,
        purpose: false,
        languages: false,
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

  // Create assessment lessons based on user language preferences
  const assessmentLessons = await Promise.all([
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 1,
        prompt: "How do you say 'Hello, my name is...' in German?",
        modelAnswer: "Hallo, ich heiße...",
        completed: false,
        sourceLanguage: onboarding.nativeLanguage || "English", // Get from onboarding
        targetLanguage: onboarding.targetLanguage || "German"   // Get from onboarding
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 2,
        prompt: "How do you ask 'Where is the bathroom?' in German?",
        modelAnswer: "Wo ist die Toilette?",
        completed: false,
        sourceLanguage: onboarding.nativeLanguage || "English",
        targetLanguage: onboarding.targetLanguage || "German"
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 3,
        prompt: "How do you say 'I would like to order a coffee' in German?",
        modelAnswer: "Ich möchte einen Kaffee bestellen",
        completed: false,
        sourceLanguage: onboarding.nativeLanguage || "English",
        targetLanguage: onboarding.targetLanguage || "German"
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 4,
        prompt: "How do you say 'How much does this cost?' in German?",
        modelAnswer: "Wie viel kostet das?",
        completed: false,
        sourceLanguage: onboarding.nativeLanguage || "English",
        targetLanguage: onboarding.targetLanguage || "German"
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 5,
        prompt: "How do you say 'I don't understand' in German?",
        modelAnswer: "Ich verstehe nicht",
        completed: false,
        sourceLanguage: onboarding.nativeLanguage || "English",
        targetLanguage: onboarding.targetLanguage || "German"
      }
    })
  ])

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
            type: LessonStepType.prompt,
            content: 'How do you say "My name is..." in German?',
            contentAudioUrl: 'https://example.com/audio/english/my_name_is.mp3',
            translation: 'Ich heiße...',
            expectedAnswer: 'Ich heiße',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_heisse.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'Repeat: "Ich bin [your name]"',
            contentAudioUrl: 'https://example.com/audio/german/ich_bin.mp3',
            translation: 'I am [your name]',
            expectedAnswer: 'Ich bin',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ich_bin.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 5,
            type: LessonStepType.model_answer,
            content: 'Great job! Now let\'s practice: "Nice to meet you"',
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
            content: 'Schön, Sie kennenzulernen',
            contentAudioUrl: 'https://example.com/audio/german/schoen_sie_kennenzulernen.mp3',
            translation: 'Nice to meet you (formal)',
            expectedAnswer: 'Schön, Sie kennenzulernen',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/schoen_sie_kennenzulernen.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 7,
            type: LessonStepType.practice,
            content: 'How would you say "Nice to meet you" informally?',
            contentAudioUrl: null,
            translation: 'Schön, dich kennenzulernen',
            expectedAnswer: 'Schön, dich kennenzulernen',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/schoen_dich_kennenzulernen.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          }
        ]
      }
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
            content: 'Ein Zimmer, bitte',
            contentAudioUrl: 'https://example.com/audio/german/ein_zimmer_bitte.mp3',
            translation: 'A room, please',
            expectedAnswer: 'Ein Zimmer, bitte',
            expectedAnswerAudioUrl: 'https://example.com/audio/german/ein_zimmer_bitte.mp3',
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 4,
            type: LessonStepType.model_answer,
            content: 'Good progress! Now let\'s try asking about public transportation.',
            contentAudioUrl: null,
            translation: null,
            expectedAnswer: null,
            expectedAnswerAudioUrl: null,
            attempts: 0,
            correct: false,
            errorPatterns: []
          },
          {
            stepNumber: 5,
            type: LessonStepType.prompt,
            content: 'How do you ask "When does the next bus arrive?" in German?',
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
  console.log(`Created ${assessmentLessons.length} assessment lessons`)
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
