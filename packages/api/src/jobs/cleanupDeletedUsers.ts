import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupDeletedUsers() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    // Find all users who are soft-deleted and whose deletedAt is older than or equal to cutoffDate, and not yet permanently deleted.
    const usersToAnonymize = await prisma.user.findMany({
        where: {
            deletedAt: {
                lte: cutoffDate,
            },
            isPermanentlyDeleted: false,
        },
        select: {
            id: true,
            username: true,
        },
    });

    if (usersToAnonymize.length === 0) {
        return;
    }

    console.log(`[cleanupDeletedUsers] Found ${usersToAnonymize.length} accounts to permanently anonymize.`);

    for (const user of usersToAnonymize) {
        try {
            const timestamp = Date.now();
            const anonEmail = `deleted_user_${user.id}_${timestamp}@deleted.local`;
            const anonUsername = `deleted_user_${user.id}_${timestamp}`;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    hashedPassword: '',
                    email: anonEmail,
                    username: anonUsername,
                    firstName: 'Người dùng',
                    lastName: 'không khả dụng',
                    isPermanentlyDeleted: true,
                },
            });

            console.log(`[cleanupDeletedUsers] Successfully anonymized user ID ${user.id} (${user.username})`);
        } catch (err) {
            console.error(`[cleanupDeletedUsers] Failed to anonymize user ID ${user.id}:`, err);
        }
    }
}

export function startCleanupDeletedUsersJob() {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[cleanupDeletedUsers] Running scheduled daily cleanup...');
        try {
            await cleanupDeletedUsers();
        } catch (err) {
            console.error('[cleanupDeletedUsers] Job error:', err);
        }
    });

    console.log('[cleanupDeletedUsers] Scheduled daily cleanup job at 00:00 AM');
}
