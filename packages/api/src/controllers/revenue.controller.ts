import { Request, Response } from 'express';
import { NotificationType, PrismaClient, PayoutStatus, ReferralChannel } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';
import { createNotification } from '../services/notification.service';
import { writeAdminAuditLog } from '../services/adminAudit.service';
import { calculateRevenueSplit } from '../services/enroll.service';

const prisma = new PrismaClient();

async function backfillMissingRevenueLedgers(): Promise<void> {
    const enrollments = await prisma.enrollment.findMany({
        where: {
            revenueLedger: null,
            type: 'PAID',
            isActive: true,
            course: {
                price: { gt: 0 },
            },
        },
        include: {
            payment: true,
            course: {
                select: {
                    id: true,
                    price: true,
                    teacherId: true,
                },
            },
        },
    });

    if (enrollments.length === 0) return;

    await prisma.$transaction(async (tx) => {
        for (const enrollment of enrollments) {
            const grossAmount = enrollment.payment?.amount && enrollment.payment.amount > 0
                ? enrollment.payment.amount
                : enrollment.course.price;
            
            // Backfilled items assume ORGANIC traffic channel
            const split = await calculateRevenueSplit(
                tx,
                grossAmount,
                enrollment.course.id,
                enrollment.studentId,
                null
            );

            const payment = enrollment.payment
                ? await tx.payment.update({
                    where: { id: enrollment.payment.id },
                    data: {
                        amount: grossAmount,
                        status: 'SUCCESSFUL',
                    },
                })
                : await tx.payment.create({
                    data: {
                        amount: grossAmount,
                        status: 'SUCCESSFUL',
                        stripeSessionId: `backfill-${enrollment.id}-${Date.now()}`,
                        enrollmentId: enrollment.id,
                        studentId: enrollment.studentId,
                    },
                });

            await tx.revenueLedger.create({
                data: {
                    paymentId: payment.id,
                    enrollmentId: enrollment.id,
                    courseId: enrollment.course.id,
                    teacherId: enrollment.course.teacherId,
                    grossAmount,
                    platformFee: split.platformFee,
                    teacherShare: split.teacherShare,
                    stripeFee: split.stripeFee,
                    netRevenue: split.netRevenue,
                    channel: split.channel,
                    payoutStatus: PayoutStatus.HELD,
                },
            });
        }
    });
}

// Admin: list ledger with filters
export async function getRevenueLedgerController(req: Request, res: Response): Promise<Response> {
    try {
        await backfillMissingRevenueLedgers();

        const { teacherId, courseId, payoutStatus, from, to, page = '1', limit = '50' } = req.query;

        const where: Record<string, unknown> = {};
        if (teacherId) where.teacherId = Number(teacherId);
        if (courseId) where.courseId = Number(courseId);
        if (payoutStatus) where.payoutStatus = payoutStatus as PayoutStatus;
        if (from || to) {
            where.createdAt = {};
            if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from as string);
            if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to as string);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Math.min(Number(limit), 200);

        const [rows, total] = await Promise.all([
            prisma.revenueLedger.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    course: { select: { id: true, title: true } },
                    teacher: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
                    payment: { select: { id: true, stripeSessionId: true, createdAt: true } },
                },
            }),
            prisma.revenueLedger.count({ where }),
        ]);

        const summary = await prisma.revenueLedger.aggregate({
            where,
            _sum: { grossAmount: true, platformFee: true, teacherShare: true, stripeFee: true, netRevenue: true },
        });

        return res.status(200).json({
            rows,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / take),
            summary: {
                grossAmount: summary._sum.grossAmount ?? 0,
                platformFee: summary._sum.platformFee ?? 0,
                teacherShare: summary._sum.teacherShare ?? 0,
                stripeFee: summary._sum.stripeFee ?? 0,
                netRevenue: summary._sum.netRevenue ?? 0,
            },
        });
    } catch {
        return res.status(500).json({ error: 'Unable to fetch revenue ledger' });
    }
}

// Admin: mark ledger entries as paid
export async function markPayoutController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        const { ids } = req.body as { ids: number[] };
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        const eligibleLedgers = await prisma.revenueLedger.findMany({
            where: { id: { in: ids }, payoutStatus: PayoutStatus.HELD },
            select: { id: true, teacherId: true, teacherShare: true, course: { select: { title: true } } },
        });

        if (eligibleLedgers.length === 0) {
            return res.status(200).json({ updated: 0 });
        }

        const paidAt = new Date();
        const result = await prisma.$transaction(
            eligibleLedgers.map((ledger) =>
                prisma.revenueLedger.updateMany({
                    where: { id: ledger.id, payoutStatus: PayoutStatus.HELD },
                    data: { payoutStatus: PayoutStatus.PAID, paidAt },
                })
            )
        );

        const updated = result.reduce((sum, r) => sum + r.count, 0);

        if (updated > 0) {
            await Promise.allSettled(
                eligibleLedgers.map((ledger) =>
                    createNotification({
                        userId: ledger.teacherId,
                        type: NotificationType.DEADLINE_REMINDER,
                        title: 'Tien day hoc da duoc duyet',
                        message: `Khoan thanh toan ${ledger.teacherShare.toFixed(2)} cho khoa hoc "${ledger.course.title}" da duoc duyet.`,
                        link: '/teacher/earnings',
                        dedupeKey: `payout-approved-${ledger.id}-${paidAt.toISOString()}`,
                        sendEmail: true,
                    })
                )
            );

            await writeAdminAuditLog({
                adminId: authReq.user?.userId,
                action: 'UPDATE',
                resource: 'PAYOUT',
                description: `Marked ${updated} payout ledger entries as PAID`,
                metadata: {
                    ledgerIds: eligibleLedgers.map((l) => l.id),
                    teacherIds: [...new Set(eligibleLedgers.map((l) => l.teacherId))],
                    paidAt: paidAt.toISOString(),
                },
                after: {
                    payoutStatus: 'PAID',
                    updatedCount: updated,
                },
            });
        }

        return res.status(200).json({ updated });
    } catch {
        return res.status(500).json({ error: 'Unable to mark payout' });
    }
}

// Admin: export CSV
export async function exportRevenueCSVController(req: Request, res: Response): Promise<void> {
    try {
        await backfillMissingRevenueLedgers();

        const { teacherId, courseId, payoutStatus, from, to } = req.query;

        const where: Record<string, unknown> = {};
        if (teacherId) where.teacherId = Number(teacherId);
        if (courseId) where.courseId = Number(courseId);
        if (payoutStatus) where.payoutStatus = payoutStatus as PayoutStatus;
        if (from || to) {
            where.createdAt = {};
            if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from as string);
            if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to as string);
        }

        const rows = await prisma.revenueLedger.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                course: { select: { title: true } },
                teacher: { select: { username: true, email: true } },
                payment: { select: { stripeSessionId: true, createdAt: true } },
            },
        });

        const escapeCSV = (v: unknown): string => {
            const s = String(v ?? '');
            if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r') || /^[=+\-@]/.test(s)) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const header = 'ID,Date,Course,Teacher,Email,Gross,StripeFee,NetRevenue,PlatformFee,TeacherShare,Channel,Status,PaidAt,StripeSession\n';
        const csvRows = rows.map((r) => [
            r.id,
            r.createdAt.toISOString(),
            escapeCSV(r.course.title),
            escapeCSV(r.teacher.username),
            escapeCSV(r.teacher.email),
            r.grossAmount,
            r.stripeFee,
            r.netRevenue,
            r.platformFee,
            r.teacherShare,
            r.channel,
            r.payoutStatus,
            r.paidAt?.toISOString() ?? '',
            escapeCSV(r.payment.stripeSessionId),
        ].join(','));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="revenue-${Date.now()}.csv"`);
        res.send(header + csvRows.join('\n'));
    } catch {
        res.status(500).json({ error: 'Unable to export CSV' });
    }
}

// Teacher: read-only earnings view
export async function getMyEarningsController(req: Request, res: Response): Promise<Response> {
    try {
        await backfillMissingRevenueLedgers();

        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'Not authenticated' });

        const teacherId = authReq.user.userId;

        const [held, paid] = await Promise.all([
            prisma.revenueLedger.aggregate({
                where: { teacherId, payoutStatus: PayoutStatus.HELD },
                _sum: { teacherShare: true },
                _count: true,
            }),
            prisma.revenueLedger.aggregate({
                where: { teacherId, payoutStatus: PayoutStatus.PAID },
                _sum: { teacherShare: true },
                _count: true,
            }),
        ]);

        const recentEntries = await prisma.revenueLedger.findMany({
            where: { teacherId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                course: { select: { id: true, title: true } },
                payment: { select: { createdAt: true } },
            },
        });

        return res.status(200).json({
            heldAmount: held._sum.teacherShare ?? 0,
            paidAmount: paid._sum.teacherShare ?? 0,
            totalSales: (held._count ?? 0) + (paid._count ?? 0),
            recentEntries,
        });
    } catch {
        return res.status(500).json({ error: 'Unable to fetch earnings' });
    }
}
