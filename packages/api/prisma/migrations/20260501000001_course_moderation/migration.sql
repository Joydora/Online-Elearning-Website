-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Course" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Course" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Course" ADD COLUMN "reviewedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
