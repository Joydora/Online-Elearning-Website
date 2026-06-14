-- AlterTable
ALTER TABLE "Course" ADD COLUMN "accessDurationDays" INTEGER;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
