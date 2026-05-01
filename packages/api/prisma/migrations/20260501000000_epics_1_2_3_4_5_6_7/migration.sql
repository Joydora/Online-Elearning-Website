-- Epic 1,2: Enrollment enums and expiry fields
CREATE TYPE "EnrollmentType" AS ENUM ('TRIAL', 'PAID', 'FREE');
CREATE TYPE "PayoutStatus" AS ENUM ('HELD', 'PAID');
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- Epic 3: PRACTICE content type
ALTER TYPE "ContentType" ADD VALUE 'PRACTICE';

-- Epic 1: Trial fields on Course
ALTER TABLE "Course" ADD COLUMN "trialDurationDays" INTEGER;
-- Epic 2: Time-limit fields on Course
ALTER TABLE "Course" ADD COLUMN "accessDurationDays" INTEGER;
-- Epic 5: Level on Course
ALTER TABLE "Course" ADD COLUMN "level" "CourseLevel";

-- Epic 5: Course prerequisites self-relation
CREATE TABLE "_CoursePrerequisites" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "_CoursePrerequisites_AB_unique" ON "_CoursePrerequisites"("A", "B");
CREATE INDEX "_CoursePrerequisites_B_index" ON "_CoursePrerequisites"("B");
ALTER TABLE "_CoursePrerequisites" ADD CONSTRAINT "_CoursePrerequisites_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CoursePrerequisites" ADD CONSTRAINT "_CoursePrerequisites_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Epic 1: isFreePreview on Content
ALTER TABLE "Content" ADD COLUMN "isFreePreview" BOOLEAN NOT NULL DEFAULT false;

-- Epic 1,2: Enrollment type + expiry + isActive
ALTER TABLE "Enrollment" ADD COLUMN "type" "EnrollmentType" NOT NULL DEFAULT 'PAID';
ALTER TABLE "Enrollment" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Enrollment_isActive_expiresAt_idx" ON "Enrollment"("isActive", "expiresAt");
CREATE INDEX "Enrollment_studentId_isActive_idx" ON "Enrollment"("studentId", "isActive");

-- Epic 7: watchedSeconds on ContentProgress
ALTER TABLE "ContentProgress" ADD COLUMN "watchedSeconds" INTEGER;

-- Epic 3: Practice model
CREATE TABLE "Practice" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "starterCode" TEXT,
    "expectedOutput" TEXT,
    "rubric" TEXT,
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "contentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Practice_contentId_key" ON "Practice"("contentId");
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_contentId_fkey"
    FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Epic 3: PracticeSubmission model
CREATE TABLE "PracticeSubmission" (
    "id" SERIAL NOT NULL,
    "submittedCode" TEXT NOT NULL,
    "aiFeedback" TEXT,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,
    "practiceId" INTEGER NOT NULL,
    CONSTRAINT "PracticeSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PracticeSubmission_studentId_practiceId_idx" ON "PracticeSubmission"("studentId", "practiceId");
ALTER TABLE "PracticeSubmission" ADD CONSTRAINT "PracticeSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PracticeSubmission" ADD CONSTRAINT "PracticeSubmission_practiceId_fkey"
    FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Epic 4: RevenueLedger model
CREATE TABLE "RevenueLedger" (
    "id" SERIAL NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "teacherShare" DOUBLE PRECISION NOT NULL,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'HELD',
    "paidAt" TIMESTAMP(3),
    "paymentId" INTEGER NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevenueLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RevenueLedger_paymentId_key" ON "RevenueLedger"("paymentId");
CREATE UNIQUE INDEX "RevenueLedger_enrollmentId_key" ON "RevenueLedger"("enrollmentId");
CREATE INDEX "RevenueLedger_teacherId_payoutStatus_idx" ON "RevenueLedger"("teacherId", "payoutStatus");
CREATE INDEX "RevenueLedger_courseId_idx" ON "RevenueLedger"("courseId");
CREATE INDEX "RevenueLedger_createdAt_idx" ON "RevenueLedger"("createdAt");
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Epic 6: Project model
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "courseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Project" ADD CONSTRAINT "Project_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Epic 6: ProjectSubmission model
CREATE TABLE "ProjectSubmission" (
    "id" SERIAL NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "commitHistory" JSONB NOT NULL DEFAULT '[]',
    "feedback" TEXT,
    "grade" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectSubmission_projectId_studentId_key" ON "ProjectSubmission"("projectId", "studentId");
CREATE INDEX "ProjectSubmission_projectId_idx" ON "ProjectSubmission"("projectId");
CREATE INDEX "ProjectSubmission_studentId_idx" ON "ProjectSubmission"("studentId");
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
