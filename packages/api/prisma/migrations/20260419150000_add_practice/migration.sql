-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'PRACTICE';

-- CreateTable
CREATE TABLE "Practice" (
    "id" SERIAL NOT NULL,
    "contentId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "starterCode" TEXT,
    "expectedOutput" TEXT,
    "language" TEXT NOT NULL DEFAULT 'plaintext',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSubmission" (
    "id" SERIAL NOT NULL,
    "practiceId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "submittedCode" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_contentId_key" ON "Practice"("contentId");

-- CreateIndex
CREATE INDEX "PracticeSubmission_studentId_practiceId_createdAt_idx" ON "PracticeSubmission"("studentId", "practiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSubmission" ADD CONSTRAINT "PracticeSubmission_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSubmission" ADD CONSTRAINT "PracticeSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
