-- Payment.status: free-form TEXT → PaymentStatus enum.
-- Existing rows all hold the string values that match the new enum
-- (PENDING / SUCCESSFUL). FAILED and CANCELED are pre-declared so future
-- Stripe webhook failure handlers have somewhere to write.

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELED');

ALTER TABLE "Payment"
    ALTER COLUMN "status" DROP DEFAULT,
    ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus",
    ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Indexes backing the two hot query paths:
--   Payment: student dashboard scrolls by createdAt DESC;
--            revenue backfill filters by status = 'SUCCESSFUL'.
--   Enrollment: "my active courses" hits (studentId, isActive);
--               the nightly expiry cron sweeps rows WHERE expiresAt < now().

CREATE INDEX "Payment_studentId_createdAt_idx"
    ON "Payment" ("studentId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx"
    ON "Payment" ("status", "createdAt");

CREATE INDEX "Enrollment_studentId_isActive_idx"
    ON "Enrollment" ("studentId", "isActive");
CREATE INDEX "Enrollment_expiresAt_idx"
    ON "Enrollment" ("expiresAt");
