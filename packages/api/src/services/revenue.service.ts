import { PayoutStatus, PaymentStatus, Prisma } from '@prisma/client';
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
          grossAmount: Prisma.Decimal;
          platformFee: Prisma.Decimal;
          teacherShare: Prisma.Decimal;
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
                    course: {
                        select: {
                            title: true,
                            teacherId: true,
                            teacher: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    username: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status !== PaymentStatus.SUCCESSFUL) {
        throw new Error('PAYMENT_NOT_PAID');
    }

    const enrollment = payment.enrollment;
    const courseId = enrollment?.courseId;
    const teacher = enrollment?.course.teacher;
    const teacherId = enrollment?.course.teacherId;

    if (!courseId || !teacherId || !teacher) {
        throw new Error('ENROLLMENT_MISSING');
    }

    const feePct = getPlatformFeePct();
    const gross = payment.amount;
    // Decimal arithmetic — money fields are Prisma.Decimal, so `*` / `-`
    // would coerce to number and reintroduce the float dust we're
    // migrating away from. toDecimalPlaces(2) keeps reports stable.
    const platformFee = gross
        .mul(feePct)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const teacherShare = gross
        .sub(platformFee)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const teacherName =
        [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim()
        || teacher.username;

    const ledger = await prisma.revenueLedger.create({
        data: {
            paymentId: payment.id,
            courseId,
            teacherId,
            courseTitleSnapshot: enrollment.course.title.slice(0, 200),
            teacherNameSnapshot: teacherName.slice(0, 200),
            teacherEmailSnapshot: teacher.email.slice(0, 320),
            feePctSnapshot: new Prisma.Decimal(feePct).toDecimalPlaces(2),
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
