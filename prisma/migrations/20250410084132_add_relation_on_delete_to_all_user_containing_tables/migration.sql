-- DropForeignKey
ALTER TABLE "assessment_lessons" DROP CONSTRAINT "assessment_lessons_userId_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_userId_fkey";

-- DropForeignKey
ALTER TABLE "onboarding" DROP CONSTRAINT "onboarding_userId_fkey";

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_lessons" ADD CONSTRAINT "assessment_lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
