-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "LessonGenerationStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "steps" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "learningPurpose" TEXT,
    "nativeLanguage" TEXT,
    "targetLanguage" TEXT,
    "proficiencyLevel" "ProficiencyLevel",
    "initialAssessmentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_lessons" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "modelAnswer" TEXT NOT NULL,
    "userResponse" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_userId_key" ON "onboarding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_lessons" ADD CONSTRAINT "assessment_lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
