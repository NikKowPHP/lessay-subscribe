-- CreateEnum
CREATE TYPE "LearningTrajectory" AS ENUM ('steady', 'accelerating', 'plateauing');

-- CreateEnum
CREATE TYPE "LanguageInfluenceLevel" AS ENUM ('minimal', 'moderate', 'strong');

-- CreateEnum
CREATE TYPE "SpeechRateEvaluation" AS ENUM ('slow', 'appropriate', 'fast');

-- CreateEnum
CREATE TYPE "HesitationFrequency" AS ENUM ('rare', 'occasional', 'frequent');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('minor', 'moderate', 'major');

-- CreateEnum
CREATE TYPE "VocabularyRange" AS ENUM ('limited', 'adequate', 'extensive');

-- CreateEnum
CREATE TYPE "ComprehensionLevel" AS ENUM ('poor', 'fair', 'good', 'excellent');

-- CreateTable
CREATE TABLE "audio_metrics" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "assessmentLessonId" TEXT,
    "pronunciationScore" DOUBLE PRECISION NOT NULL,
    "fluencyScore" DOUBLE PRECISION NOT NULL,
    "grammarScore" DOUBLE PRECISION NOT NULL,
    "vocabularyScore" DOUBLE PRECISION NOT NULL,
    "overallPerformance" DOUBLE PRECISION NOT NULL,
    "proficiencyLevel" TEXT NOT NULL,
    "learningTrajectory" "LearningTrajectory" NOT NULL,
    "pronunciationAssessment" JSONB NOT NULL,
    "fluencyAssessment" JSONB NOT NULL,
    "grammarAssessment" JSONB NOT NULL,
    "vocabularyAssessment" JSONB NOT NULL,
    "exerciseCompletion" JSONB NOT NULL,
    "suggestedTopics" TEXT[],
    "grammarFocusAreas" TEXT[],
    "vocabularyDomains" TEXT[],
    "nextSkillTargets" TEXT[],
    "preferredPatterns" TEXT[],
    "effectiveApproaches" TEXT[],
    "audioRecordingUrl" TEXT,
    "recordingDuration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_metrics_lessonId_key" ON "audio_metrics"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "audio_metrics_assessmentLessonId_key" ON "audio_metrics"("assessmentLessonId");

-- AddForeignKey
ALTER TABLE "audio_metrics" ADD CONSTRAINT "audio_metrics_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_metrics" ADD CONSTRAINT "audio_metrics_assessmentLessonId_fkey" FOREIGN KEY ("assessmentLessonId") REFERENCES "assessment_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
