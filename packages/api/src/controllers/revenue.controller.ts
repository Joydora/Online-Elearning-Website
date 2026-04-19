import { Request, Response } from 'express';
import { PrismaClient, PayoutStatus } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

type AuthRequest = Request & { user?: AuthenticatedUser };

function parseIntOrUndefined(raw: unknown): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
}

function parseDateOrUndefined(raw: unknown): Date | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function parsePayoutStatus(raw: unknown): PayoutStatus | undefined {
    if (raw === 'HELD' || raw === 'PAID') return raw;
    return undefined;
}

export async function listRevenueController(req: Request, res: Response): Promise<Response> {
    try {
        const teacherId = parseIntOrUndefined(req.query.teacherId);
        const courseId = parseIntOrUndefined(req.query.courseId);
        const from = parseDateOrUndefined(req.query.from);
        const to = parseDateOrUndefined(req.query.to);
        const status = parsePayoutStatus(req.query.status);
        const take = Math.min(parseIntOrUndefined(req.query.limit) ?? 50, 200);
        const skip = parseIntOrUndefined(req.query.offset) ?? 0;

        const where: Record<string, unknown> = {};
        if (teacherId) where.teacherId = teacherId;
        if (courseId) where.courseId = courseId;
        if (status) where.payoutStatus = status;
        if (from || to) {
            where.createdAt = {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            };
        }

        const [rows, total, aggregates] = await Promise.all([
            prisma.revenueLedger.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    payment: {
                        select: { id: true, amount: true, createdAt: true, studentId: true },
                    },
                },
            }),
            prisma.revenueLedger.count({ where }),
            prisma.revenueLedger.aggregate({
                where,
                _sum: { grossAmount: true, platformFee: true, teacherShare: true },
                _count: { _all: true },
            }),
        ]);

        const heldCount = await prisma.revenueLedger.count({
            where: { ...where, payoutStatus: 'HELD' },
        });
        const paidCount = await prisma.revenueLedger.count({
            where: { ...where, payoutStatus: 'PAID' },
        });

        // Enrich rows with course + teacher snapshot so the UI can display names
        const courseIds = Array.from(new Set(rows.map((r) => r.courseId)));
        const teacherIds = Array.from(new Set(rows.map((r) => r.teacherId)));
        const [courses, teachers] = await Promise.all([
            prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, title: true, price: true },
            }),
            prisma.user.findMany({
                where: { id: { in: teacherIds } },
                select: { id: true, username: true, firstName: true, lastName: true, email: true },
            }),
        ]);
        const courseMap = new Map(courses.map((c) => [c.id, c]));
        const teacherMap = new Map(teachers.map((t) => [t.id, t]));

        return res.status(200).json({
            rows: rows.map((r) => ({
                ...r,
                course: courseMap.get(r.courseId) ?? null,
                teacher: teacherMap.get(r.teacherId) ?? null,
            })),
            pagination: { total, limit: take, offset: skip },
            aggregates: {
                totalGross: aggregates._sum.grossAmount ?? 0,
                totalPlatformFee: aggregates._sum.platformFee ?? 0,
                totalTeacherShare: aggregates._sum.teacherShare ?? 0,
                rowCount: aggregates._count._all,
                heldCount,
                paidCount,
            },
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch revenue',
            details: (error as Error).message,
        });
    }
}

export async function markRevenuePaidController(req: Request, res: Response): Promise<Response> {
    try {
        const ledgerId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(ledgerId)) {
            return res.status(400).json({ error: 'Ledger id must be a number' });
        }

        const existing = await prisma.revenueLedger.findUnique({ where: { id: ledgerId } });
        if (!existing) {
            return res.status(404).json({ error: 'Ledger entry not found' });
        }

        if (existing.payoutStatus === 'PAID') {
            return res.status(200).json(existing);
        }

        const updated = await prisma.revenueLedger.update({
            where: { id: ledgerId },
            data: { payoutStatus: 'PAID', paidAt: new Date() },
        });

        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to mark revenue paid',
            details: (error as Error).message,
        });
    }
}

export async function getTeacherEarningsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const teacherId = authReq.user.userId;

        const [aggregate, held, paid] = await Promise.all([
            prisma.revenueLedger.aggregate({
                where: { teacherId },
                _sum: { grossAmount: true, platformFee: true, teacherShare: true },
                _count: { _all: true },
            }),
            prisma.revenueLedger.aggregate({
                where: { teacherId, payoutStatus: 'HELD' },
                _sum: { teacherShare: true },
            }),
            prisma.revenueLedger.aggregate({
                where: { teacherId, payoutStatus: 'PAID' },
                _sum: { teacherShare: true },
            }),
        ]);

        return res.status(200).json({
            totalGross: aggregate._sum.grossAmount ?? 0,
            totalPlatformFee: aggregate._sum.platformFee ?? 0,
            totalTeacherShare: aggregate._sum.teacherShare ?? 0,
            heldTeacherShare: held._sum.teacherShare ?? 0,
            paidTeacherShare: paid._sum.teacherShare ?? 0,
            salesCount: aggregate._count._all,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch earnings',
            details: (error as Error).message,
        });
    }
}
