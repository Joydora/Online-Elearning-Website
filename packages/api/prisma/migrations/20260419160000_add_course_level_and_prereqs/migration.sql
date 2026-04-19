-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "level" "CourseLevel";

-- CreateTable (Prisma implicit-M2M join table for Course<->Course prerequisites)
CREATE TABLE "_CoursePrerequisites" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CoursePrerequisites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CoursePrerequisites_B_index" ON "_CoursePrerequisites"("B");

-- AddForeignKey
ALTER TABLE "_CoursePrerequisites" ADD CONSTRAINT "_CoursePrerequisites_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoursePrerequisites" ADD CONSTRAINT "_CoursePrerequisites_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
