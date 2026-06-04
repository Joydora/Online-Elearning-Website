import { Notification, NotificationType, Prisma, PrismaClient } from '@prisma/client';
import { sendNotificationEmail } from './email.service';
import { getEffectivePreference } from './notificationPreference.service';
import { emitNotificationUnreadCount } from './notificationHub';

const prisma = new PrismaClient();
function isMissingTableError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

export type CreateNotificationInput = {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Prisma.InputJsonValue;
    dedupeKey?: string;
    sendEmail?: boolean;
};

export async function getUnreadCountForUser(userId: number): Promise<number> {
    try {
        return await prisma.notification.count({ where: { userId, isRead: false } });
    } catch (error) {
        if (isMissingTableError(error)) return 0;
        throw error;
    }
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
    const { inAppEnabled, emailEnabled } = await getEffectivePreference(input.userId, input.type);
    const shouldEmail = !!input.sendEmail && emailEnabled;
    const shouldInApp = inAppEnabled;

    if (!shouldInApp && !shouldEmail) {
        return null;
    }

    if (shouldInApp && input.dedupeKey) {
        try {
            const existing = await prisma.notification.findUnique({
                where: { dedupeKey: input.dedupeKey },
            });
            if (existing) {
                return existing;
            }
        } catch (error) {
            if (isMissingTableError(error)) {
                // Notification table not migrated yet: don't block core flow.
                return null;
            }
            throw error;
        }
    }

    let notification: Notification | null = null;

    if (shouldInApp) {
        try {
            notification = await prisma.notification.create({
                data: {
                    userId: input.userId,
                    type: input.type,
                    title: input.title,
                    message: input.message,
                    link: input.link,
                    metadata: input.metadata,
                    dedupeKey: input.dedupeKey,
                },
            });
        } catch (error) {
            if (isMissingTableError(error)) {
                // Notification table not migrated yet: skip in-app notification.
                notification = null;
                return null;
            }
            if (
                input.dedupeKey &&
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                const existing = await prisma.notification.findUnique({
                    where: { dedupeKey: input.dedupeKey },
                });
                if (existing) {
                    return existing;
                }
            }
            throw error;
        }
    }

    if (shouldEmail) {
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true, username: true, firstName: true, lastName: true },
        });

        if (user) {
            const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
            const sent = await sendNotificationEmail(user.email, name, input.title, input.message, input.link);
            if (sent && notification) {
                await prisma.notification.update({
                    where: { id: notification.id },
                    data: { sentEmailAt: new Date() },
                });
            }
        }
    }

    if (notification) {
        const unreadCount = await getUnreadCountForUser(input.userId);
        emitNotificationUnreadCount(input.userId, unreadCount);
    }

    return notification;
}

export async function listMyNotifications(userId: number, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safePageSize;

    let items: Notification[] = [];
    let total = 0;
    let unreadCount = 0;
    try {
        [items, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safePageSize,
            }),
            prisma.notification.count({ where: { userId } }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);
    } catch (error) {
        if (!isMissingTableError(error)) {
            throw error;
        }
    }

    return {
        items,
        pagination: {
            page: safePage,
            pageSize: safePageSize,
            total,
            totalPages: Math.ceil(total / safePageSize),
        },
        unreadCount,
    };
}

export async function markNotificationRead(userId: number, notificationId: number) {
    let found;
    try {
        found = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
    } catch (error) {
        if (isMissingTableError(error)) {
            throw new Error('NOTIFICATION_TABLE_NOT_READY');
        }
        throw error;
    }
    if (!found) {
        throw new Error('NOTIFICATION_NOT_FOUND');
    }

    let updated;
    try {
        updated = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true, readAt: new Date() },
        });
    } catch (error) {
        if (isMissingTableError(error)) {
            throw new Error('NOTIFICATION_TABLE_NOT_READY');
        }
        throw error;
    }

    const unreadCount = await getUnreadCountForUser(userId);
    emitNotificationUnreadCount(userId, unreadCount);

    return updated;
}

export async function markAllNotificationsRead(userId: number) {
    let result = { count: 0 };
    try {
        result = await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    } catch (error) {
        if (!isMissingTableError(error)) {
            throw error;
        }
    }

    emitNotificationUnreadCount(userId, 0);

    return result;
}
