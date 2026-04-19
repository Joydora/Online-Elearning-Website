import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Flip isActive=false on any enrollment whose expiresAt has passed.
 * Returns the count of rows that were deactivated.
 */
export async function runExpirySweep(): Promise<number> {
    const now = new Date();
    const result = await prisma.enrollment.updateMany({
        where: {
            isActive: true,
            expiresAt: { not: null, lte: now },
        },
        data: { isActive: false },
    });
    return result.count;
}

/**
 * Schedules runExpirySweep to fire daily at 00:05 server time.
 * Also runs once on startup so expired rows don't have to wait up to 24h.
 */
export function scheduleExpirySweep(): void {
    // Run once immediately on boot (fire-and-forget).
    runExpirySweep()
        .then((n) => {
            if (n > 0) {
                console.log(`⏰ Startup expiry sweep deactivated ${n} enrollment(s)`);
            }
        })
        .catch((err) => {
            console.error('⚠️  Startup expiry sweep failed:', err);
        });

    // 00:05 every day — slight offset from midnight to avoid other cron traffic.
    cron.schedule('5 0 * * *', async () => {
        try {
            const n = await runExpirySweep();
            console.log(`⏰ Daily expiry sweep deactivated ${n} enrollment(s)`);
        } catch (err) {
            console.error('⚠️  Daily expiry sweep failed:', err);
        }
    });
}
