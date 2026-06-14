-- CreateTable
CREATE TABLE "ContentCompletion" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCompletion_studentId_contentId_key" ON "ContentCompletion"("studentId", "contentId");

-- CreateIndex
CREATE INDEX "ContentCompletion_studentId_idx" ON "ContentCompletion"("studentId");

-- AddForeignKey
ALTER TABLE "ContentCompletion" ADD CONSTRAINT "ContentCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCompletion" ADD CONSTRAINT "ContentCompletion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
