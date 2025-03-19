import { PrismaClient, ProficiencyLevel, LessonGenerationStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.assessmentLesson.deleteMany({})
  await prisma.onboarding.deleteMany({})
  await prisma.user.deleteMany({})
  
  // Create test user (matching the mock auth service)
  const user = await prisma.user.create({
    data: {
      id: 1, // We'll use a numeric ID internally that matches Supabase's 'mock-user-id'
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

  console.log(`Created user: ${user.email}`)
  console.log(`Created onboarding for user`)
  console.log(`created onboarding onboarding: ${onboarding.id}`)
  console.log(`Created ${assessmentLessons.length} assessment lessons`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })