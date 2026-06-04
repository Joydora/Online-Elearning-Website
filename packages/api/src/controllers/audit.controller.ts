import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAdminAuditLogsController(req: Request, res: Response): Promise<Response> {
    try {
        const { action, resource, page = '1', limit = '50' } = req.query;
        const where: Record<string, unknown> = {};
        if (action) where.action = String(action);
        if (resource) where.resource = String(resource);

        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
        const skip = (safePage - 1) * safeLimit;

        const [rows, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                skip,
                take: safeLimit,
                orderBy: { createdAt: 'desc' },
                include: {
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.adminAuditLog.count({ where }),
        ]);

        return res.status(200).json({
            rows,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        });
    } catch {
        return res.status(500).json({ error: 'Unable to fetch admin audit logs' });
    }
}

