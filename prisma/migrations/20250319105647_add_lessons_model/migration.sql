/*
  Warnings:

  - You are about to drop the `assessment_lessons` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "assessment_lessons" DROP CONSTRAINT "assessment_lessons_userId_fkey";

-- DropTable
DROP TABLE "assessment_lessons";

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "focusArea" TEXT NOT NULL,
    "targetSkills" TEXT[],
    "sequence" JSONB NOT NULL,
    "performanceMetrics" JSONB,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
