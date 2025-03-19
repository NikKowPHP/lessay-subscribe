-- CreateTable
CREATE TABLE "assessment_lessons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "modelAnswer" TEXT NOT NULL,
    "userResponse" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_lessons_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "assessment_lessons" ADD CONSTRAINT "assessment_lessons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
