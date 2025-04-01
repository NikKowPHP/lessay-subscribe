/*
  Warnings:

  - The values [user_response] on the enum `AssessmentStepType` will be removed. If these variants are still used in the database, this will fail.
  - The values [model_answer,user_answer] on the enum `LessonStepType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AssessmentStepType_new" AS ENUM ('question', 'feedback', 'instruction', 'summary');
ALTER TABLE "assessment_steps" ALTER COLUMN "type" TYPE "AssessmentStepType_new" USING ("type"::text::"AssessmentStepType_new");
ALTER TYPE "AssessmentStepType" RENAME TO "AssessmentStepType_old";
ALTER TYPE "AssessmentStepType_new" RENAME TO "AssessmentStepType";
DROP TYPE "AssessmentStepType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LessonStepType_new" AS ENUM ('prompt', 'feedback', 'new_word', 'practice', 'instruction', 'summary');
ALTER TABLE "lesson_steps" ALTER COLUMN "type" TYPE "LessonStepType_new" USING ("type"::text::"LessonStepType_new");
ALTER TYPE "LessonStepType" RENAME TO "LessonStepType_old";
ALTER TYPE "LessonStepType_new" RENAME TO "LessonStepType";
DROP TYPE "LessonStepType_old";
COMMIT;
