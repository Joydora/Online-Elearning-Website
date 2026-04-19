-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('HELD', 'PAID');

-- CreateTable
CREATE TABLE "RevenueLedger" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "teacherShare" DOUBLE PRECISION NOT NULL,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'HELD',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueLedger_paymentId_key" ON "RevenueLedger"("paymentId");

-- CreateIndex
CREATE INDEX "RevenueLedger_teacherId_createdAt_idx" ON "RevenueLedger"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "RevenueLedger_payoutStatus_idx" ON "RevenueLedger"("payoutStatus");

-- AddForeignKey
ALTER TABLE "RevenueLedger" ADD CONSTRAINT "RevenueLedger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
