-- CreateTable
CREATE TABLE "lesson_steps" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "translation" TEXT,
    "userResponse" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    "lastAttemptAt" TIMESTAMP(3),
    "errorPatterns" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
