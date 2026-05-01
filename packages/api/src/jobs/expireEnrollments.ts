import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendEnrollmentExpiryReminder } from '../services/email.service';

const prisma = new PrismaClient();

async function expireEnrollments() {
    const now = new Date();

    // Set isActive=false for all expired active enrollments
    const expired = await prisma.enrollment.updateMany({
        where: {
            isActive: true,
            expiresAt: { lte: now },
        },
        data: { isActive: false },
    });

    if (expired.count > 0) {
        console.log(`[expireEnrollments] Deactivated ${expired.count} expired enrollments`);
    }
}

async function sendExpiryReminders(daysAhead: number) {
    const from = new Date();
    from.setDate(from.getDate() + daysAhead);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setHours(23, 59, 59, 999);

    const enrollments = await prisma.enrollment.findMany({
        where: {
            isActive: true,
            expiresAt: { gte: from, lte: to },
        },
        include: {
            student: { select: { email: true, firstName: true, username: true } },
            course: { select: { title: true } },
        },
    });

    for (const enrollment of enrollments) {
        try {
            await sendEnrollmentExpiryReminder(
                enrollment.student.email,
                enrollment.student.firstName || enrollment.student.username,
                enrollment.course.title,
                daysAhead,
            );
        } catch (err) {
            console.error(`[expireEnrollments] Failed to send reminder for enrollment ${enrollment.id}:`, err);
        }
    }
}

export function startEnrollmentExpiryJob() {
    // Run daily at 01:00 AM
    cron.schedule('0 1 * * *', async () => {
        console.log('[expireEnrollments] Running daily expiry job...');
        try {
            await expireEnrollments();
            await sendExpiryReminders(7);
            await sendExpiryReminders(1);
        } catch (err) {
            console.error('[expireEnrollments] Job error:', err);
        }
    });

    console.log('[expireEnrollments] Scheduled daily at 01:00 AM');
}
