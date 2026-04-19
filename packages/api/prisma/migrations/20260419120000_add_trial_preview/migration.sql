-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('TRIAL', 'PAID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripePaymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "trialDurationDays" INTEGER;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "type" "EnrollmentType" NOT NULL DEFAULT 'PAID',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "trialCardFingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Enrollment_trialCardFingerprint_courseId_idx" ON "Enrollment"("trialCardFingerprint", "courseId");
