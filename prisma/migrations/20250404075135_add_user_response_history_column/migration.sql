-- AlterTable
ALTER TABLE "assessment_steps" ADD COLUMN     "userResponseHistory" JSONB;

-- AlterTable
ALTER TABLE "lesson_steps" ADD COLUMN     "userResponseHistory" JSONB;
