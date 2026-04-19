import { PayoutStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const DEFAULT_PLATFORM_FEE_PCT = 20;

function getPlatformFeePct(): number {
    const raw = process.env.PLATFORM_FEE_PCT;
    if (raw === undefined || raw === '') return DEFAULT_PLATFORM_FEE_PCT;
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return DEFAULT_PLATFORM_FEE_PCT;
    }
    return pct;
}

/**
 * Idempotently record a RevenueLedger entry for a SUCCESSFUL payment.
 *
 * Returns:
 *   { created: true, ledgerId, ... }     — first time we've seen this payment
 *   { created: false, skipped: 'ALREADY_RECORDED' } — a prior call already booked it
 *
 * Throws:
 *   PAYMENT_NOT_FOUND   — no matching payment row
 *   PAYMENT_NOT_PAID    — payment exists but is not SUCCESSFUL
 *   ENROLLMENT_MISSING  — payment has no enrollment/course/teacher we can attribute to
 */
export async function recordRevenue(paymentId: number): Promise<
    | {
          created: true;
          ledgerId: number;
          grossAmount: number;
          platformFee: number;
          teacherShare: number;
      }
    | { created: false; skipped: 'ALREADY_RECORDED' }
> {
    const existing = await prisma.revenueLedger.findUnique({
        where: { paymentId },
    });
    if (existing) {
        return { created: false, skipped: 'ALREADY_RECORDED' };
    }

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: {
            id: true,
            amount: true,
            status: true,
            enrollment: {
                select: {
                    courseId: true,
                    course: { select: { teacherId: true } },
                },
            },
        },
    });

    if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'SUCCESSFUL') {
        throw new Error('PAYMENT_NOT_PAID');
    }

    const courseId = payment.enrollment?.courseId;
    const teacherId = payment.enrollment?.course.teacherId;

    if (!courseId || !teacherId) {
        throw new Error('ENROLLMENT_MISSING');
    }

    const feePct = getPlatformFeePct();
    const gross = payment.amount;
    // Round to 2 decimals to avoid floating-point dust in reports.
    const platformFee = Math.round(gross * (feePct / 100) * 100) / 100;
    const teacherShare = Math.round((gross - platformFee) * 100) / 100;

    const ledger = await prisma.revenueLedger.create({
        data: {
            paymentId: payment.id,
            courseId,
            teacherId,
            grossAmount: gross,
            platformFee,
            teacherShare,
            payoutStatus: PayoutStatus.HELD,
        },
    });

    return {
        created: true,
        ledgerId: ledger.id,
        grossAmount: gross,
        platformFee,
        teacherShare,
    };
}
