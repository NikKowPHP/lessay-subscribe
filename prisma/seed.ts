import {  ProficiencyLevel } from '@prisma/client'
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
        welcome: true,
        purpose: true,
        languages: true,
        proficiency: false
      },
      completed: false,
      learningPurpose: 'travel',
      nativeLanguage: 'English',
      targetLanguage: 'German',
      proficiencyLevel: ProficiencyLevel.beginner,
      initialAssessmentCompleted: false,
    },
  })

  // Create assessment lessons
  const assessmentLessons = await Promise.all([
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 1,
        prompt: "How do you say: 'I would like to order?'",
        modelAnswer: "I would like to order",
        completed: false
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 2,
        prompt: "How do you say: 'Can I have the menu?'",
        modelAnswer: "Can I have the menu",
        completed: false
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 3,
        prompt: "How do you say: 'The check, please'",
        modelAnswer: "The check, please",
        completed: false
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 4,
        prompt: "How do you say: 'I would like to pay'",
        modelAnswer: "I would like to pay",
        completed: false
      }
    }),
    prisma.assessmentLesson.create({
      data: {
        userId: user.id,
        step: 5,
        prompt: "How do you say: 'Do you accept credit cards?'",
        modelAnswer: "Do you accept credit cards",
        completed: false
      }
    })
  ])

  // Create regular lessons
  const lessons = await Promise.all([
    prisma.lesson.create({
      data: {
        userId: user.id,
        lessonId: 'lesson-1',
        focusArea: 'Everyday Conversation',
        targetSkills: ['Greetings', 'Small Talk'],
        steps: {
          create: [
            {
              stepNumber: 1,
              type: 'new_word',
              content: 'Guten Tag',
              contentAudioUrl: 'https://example.com/audio/guten_tag.mp3',
              translation: 'Good day',
              expectedAnswer: 'Guten Tag',
              expectedAnswerAudioUrl: 'https://example.com/audio/guten_tag.mp3',
              attempts: 0,
              correct: false,
              errorPatterns: []
            },
            {
              stepNumber: 2,
              type: 'prompt',
              content: 'How do you say "Good morning"?',
              contentAudioUrl: 'https://example.com/audio/good_morning.mp3',
              translation: 'Guten Morgen',
              expectedAnswer: 'Guten Morgen',
              expectedAnswerAudioUrl: 'https://example.com/audio/guten_morgen.mp3',
              attempts: 0,
              correct: false,
              errorPatterns: []
            },
            {
              stepNumber: 3,
              type: 'model_answer',
              content: 'My name is Anna',
              contentAudioUrl: 'https://example.com/audio/my_name_is_anna.mp3',
              translation: 'Ich heiße Anna',
              expectedAnswer: 'Ich heiße Anna',
              expectedAnswerAudioUrl: 'https://example.com/audio/ich_heiße_anna.mp3',
              attempts: 0,
              correct: false,
              errorPatterns: []
            },
            {
              stepNumber: 4,
              type: 'practice',
              content: 'Repeat after me: "Nice to meet you"',
              contentAudioUrl: 'https://example.com/audio/nice_to_meet_you.mp3',
              translation: 'Schön, Sie kennenzulernen',
              expectedAnswer: 'Schön, Sie kennenzulernen',
              expectedAnswerAudioUrl: 'https://example.com/audio/schoen_sie_kennenzulernen.mp3',
              attempts: 0,
              correct: false,
              errorPatterns: []
            }
          ]
        },
        completed: false
      }
    }),
    // Add more lessons as needed
  ])

  console.log(`Created user: ${user.email}`)
  // console.log(`Created onboarding for user`)
  // console.log(`Created onboarding: ${onboarding.id}`)
  console.log(`Created ${assessmentLessons.length} assessment lessons`)
  console.log(`Created ${lessons.length} regular lessons`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
