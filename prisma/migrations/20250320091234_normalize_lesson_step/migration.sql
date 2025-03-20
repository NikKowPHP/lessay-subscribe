/*
  Warnings:

  - Changed the type of `type` on the `lesson_steps` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LessonStepType" AS ENUM ('prompt', 'model_answer', 'user_answer', 'new_word', 'practice');

-- AlterTable
ALTER TABLE "lesson_steps" DROP COLUMN "type",
ADD COLUMN     "type" "LessonStepType" NOT NULL;
