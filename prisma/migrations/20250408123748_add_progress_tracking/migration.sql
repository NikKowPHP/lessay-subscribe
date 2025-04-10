-- CreateEnum
CREATE TYPE "MasteryLevel" AS ENUM ('NotStarted', 'Seen', 'Learning', 'Practiced', 'Known', 'Mastered');

-- CreateTable
CREATE TABLE "learning_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estimatedProficiencyLevel" "ProficiencyLevel" NOT NULL DEFAULT 'beginner',
    "overallScore" DOUBLE PRECISION,
    "learningTrajectory" "LearningTrajectory" NOT NULL DEFAULT 'steady',
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "lastLessonCompletedAt" TIMESTAMP(3),
    "lastAssessmentCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_progress" (
    "id" TEXT NOT NULL,
    "learningProgressId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "masteryLevel" "MasteryLevel" NOT NULL DEFAULT 'NotStarted',
    "lastStudiedAt" TIMESTAMP(3),
    "relatedLessonIds" TEXT[],
    "relatedAssessmentIds" TEXT[],
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_progress" (
    "id" TEXT NOT NULL,
    "learningProgressId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT,
    "masteryLevel" "MasteryLevel" NOT NULL DEFAULT 'Seen',
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesIncorrect" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "relatedLessonStepIds" TEXT[],
    "relatedAssessmentStepIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_progress_userId_key" ON "learning_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_progress_learningProgressId_topicName_key" ON "topic_progress"("learningProgressId", "topicName");

-- CreateIndex
CREATE INDEX "word_progress_learningProgressId_masteryLevel_idx" ON "word_progress"("learningProgressId", "masteryLevel");

-- CreateIndex
CREATE UNIQUE INDEX "word_progress_learningProgressId_word_key" ON "word_progress"("learningProgressId", "word");

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_learningProgressId_fkey" FOREIGN KEY ("learningProgressId") REFERENCES "learning_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_progress" ADD CONSTRAINT "word_progress_learningProgressId_fkey" FOREIGN KEY ("learningProgressId") REFERENCES "learning_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
