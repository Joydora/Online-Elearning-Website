import cron from 'node-cron';
import { NotificationType, PrismaClient } from '@prisma/client';
import { createNotification } from '../services/notification.service';

const prisma = new PrismaClient();

async function sendProjectDeadlineReminders(daysAhead: number) {
    const start = new Date();
    start.setDate(start.getDate() + daysAhead);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const projects = await prisma.project.findMany({
        where: { deadline: { gte: start, lte: end } },
        include: {
            course: {
                select: {
                    title: true,
                    enrollments: {
                        where: { isActive: true },
                        select: { studentId: true },
                    },
                },
            },
        },
    });

    for (const project of projects) {
        for (const enrollment of project.course.enrollments) {
            await createNotification({
                userId: enrollment.studentId,
                type: NotificationType.DEADLINE_REMINDER,
                title: `Deadline project sap den han (${daysAhead} ngay)`,
                message: `Project "${project.title}" cua khoa hoc "${project.course.title}" se den han sau ${daysAhead} ngay.`,
                link: `/learning/${project.courseId}/projects`,
                dedupeKey: `deadline-${project.id}-${enrollment.studentId}-${daysAhead}-${start.toISOString().slice(0, 10)}`,
                sendEmail: true,
            });
        }
    }
}

async function sendReengagementReminders() {
    const inactiveBefore = new Date();
    inactiveBefore.setDate(inactiveBefore.getDate() - 4);

    const enrollments = await prisma.enrollment.findMany({
        where: { isActive: true },
        include: {
            student: { select: { id: true } },
            course: { select: { id: true, title: true } },
            contentProgresses: {
                orderBy: { completedAt: 'desc' },
                take: 1,
                select: { completedAt: true },
            },
        },
    });

    for (const enrollment of enrollments) {
        const lastLearnedAt = enrollment.contentProgresses[0]?.completedAt;
        if (lastLearnedAt && lastLearnedAt > inactiveBefore) continue;

        await createNotification({
            userId: enrollment.student.id,
            type: NotificationType.REENGAGEMENT_REMINDER,
            title: 'Nhac hoc lai khoa hoc',
            message: `Ban da khong hoc khoa "${enrollment.course.title}" trong vai ngay gan day. Hay quay lai hoc tiep de giu tien do.`,
            link: `/learning/${enrollment.course.id}`,
            dedupeKey: `reengage-${enrollment.id}-${new Date().toISOString().slice(0, 10)}`,
            sendEmail: true,
        });
    }
}

export function startNotificationEngagementJobs() {
    // 08:00 daily
    cron.schedule('0 8 * * *', async () => {
        try {
            await sendProjectDeadlineReminders(3);
            await sendProjectDeadlineReminders(1);
        } catch (error) {
            console.error('[notificationEngagement] deadline reminder job failed:', error);
        }
    });

    // 09:00 every Monday
    cron.schedule('0 9 * * 1', async () => {
        try {
            await sendReengagementReminders();
        } catch (error) {
            console.error('[notificationEngagement] reengagement job failed:', error);
        }
    });

    console.log('[notificationEngagement] Scheduled deadline and re-engagement jobs');
}

