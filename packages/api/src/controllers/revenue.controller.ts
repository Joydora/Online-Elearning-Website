import { Request, Response } from 'express';
import { PrismaClient, PayoutStatus } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

// Admin: list ledger with filters
export async function getRevenueLedgerController(req: Request, res: Response): Promise<Response> {
    try {
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
            _sum: { grossAmount: true, platformFee: true, teacherShare: true },
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
            },
        });
    } catch {
        return res.status(500).json({ error: 'Unable to fetch revenue ledger' });
    }
}

// Admin: mark ledger entries as paid
export async function markPayoutController(req: Request, res: Response): Promise<Response> {
    try {
        const { ids } = req.body as { ids: number[] };
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        const paidAt = new Date();
        const result = await prisma.$transaction(
            ids.map((id) =>
                prisma.revenueLedger.updateMany({
                    where: { id, payoutStatus: PayoutStatus.HELD },
                    data: { payoutStatus: PayoutStatus.PAID, paidAt },
                })
            )
        );

        const updated = result.reduce((sum, r) => sum + r.count, 0);
        return res.status(200).json({ updated });
    } catch {
        return res.status(500).json({ error: 'Unable to mark payout' });
    }
}

// Admin: export CSV
export async function exportRevenueCSVController(req: Request, res: Response): Promise<void> {
    try {
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

        const header = 'ID,Date,Course,Teacher,Email,Gross,PlatformFee,TeacherShare,Status,PaidAt,StripeSession\n';
        const csvRows = rows.map((r) => [
            r.id,
            r.createdAt.toISOString(),
            escapeCSV(r.course.title),
            escapeCSV(r.teacher.username),
            escapeCSV(r.teacher.email),
            r.grossAmount,
            r.platformFee,
            r.teacherShare,
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
