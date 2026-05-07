import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AuditInput = {
    adminId?: number | null;
    action: string;
    resource: 'USER' | 'COURSE' | 'PROMOTION' | 'PAYOUT';
    resourceId?: string | number;
    description?: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
};

export async function writeAdminAuditLog(input: AuditInput): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: input.adminId ?? null,
                action: input.action,
                resource: input.resource,
                resourceId: input.resourceId !== undefined ? String(input.resourceId) : null,
                description: input.description,
                before: input.before,
                after: input.after,
                metadata: input.metadata,
            },
        });
    } catch (error) {
        // Never break main business flow because audit table is unavailable.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2021'
        ) {
            return;
        }
        throw error;
    }
}

