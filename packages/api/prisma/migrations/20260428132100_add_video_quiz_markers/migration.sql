-- CreateEnum
CREATE TYPE "VideoQuizBlockingMode" AS ENUM ('pause', 'non-blocking');

-- CreateTable
CREATE TABLE "VideoQuizMarker" (
    "id" SERIAL NOT NULL,
    "contentId" INTEGER NOT NULL,
    "timestampSec" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "blockingMode" "VideoQuizBlockingMode" NOT NULL DEFAULT 'pause',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoQuizMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoQuizMarker_contentId_timestampSec_questionId_key" ON "VideoQuizMarker"("contentId", "timestampSec", "questionId");

-- CreateIndex
CREATE INDEX "VideoQuizMarker_contentId_timestampSec_idx" ON "VideoQuizMarker"("contentId", "timestampSec");

-- CreateIndex
CREATE INDEX "VideoQuizMarker_questionId_idx" ON "VideoQuizMarker"("questionId");

-- AddForeignKey
ALTER TABLE "VideoQuizMarker" ADD CONSTRAINT "VideoQuizMarker_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuizMarker" ADD CONSTRAINT "VideoQuizMarker_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
