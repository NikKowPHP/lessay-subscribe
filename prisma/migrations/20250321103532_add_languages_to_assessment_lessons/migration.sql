/*
  Warnings:

  - Added the required column `sourceLanguage` to the `assessment_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLanguage` to the `assessment_lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "assessment_lessons" ADD COLUMN     "sourceLanguage" TEXT NOT NULL,
ADD COLUMN     "targetLanguage" TEXT NOT NULL;
