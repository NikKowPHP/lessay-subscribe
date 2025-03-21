/*
  Warnings:

  - You are about to drop the column `modelAnswer` on the `assessment_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `assessment_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `step` on the `assessment_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `userResponse` on the `assessment_lessons` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `assessment_lessons` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AssessmentStepType" AS ENUM ('question', 'user_response', 'feedback', 'instruction', 'summary');

-- AlterTable
ALTER TABLE "assessment_lessons" DROP COLUMN "modelAnswer",
DROP COLUMN "prompt",
DROP COLUMN "step",
DROP COLUMN "userResponse",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metrics" JSONB,
ADD COLUMN     "proposedTopics" TEXT[],
ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "assessment_steps" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "type" "AssessmentStepType" NOT NULL,
    "content" TEXT NOT NULL,
    "contentAudioUrl" TEXT,
    "translation" TEXT,
    "expectedAnswer" TEXT,
    "expectedAnswerAudioUrl" TEXT,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "userResponse" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "lastAttemptAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_lessons_userId_key" ON "assessment_lessons"("userId");

-- AddForeignKey
ALTER TABLE "assessment_steps" ADD CONSTRAINT "assessment_steps_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessment_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
