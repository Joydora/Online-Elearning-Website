import { NotificationType, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();
function isMissingTableError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

const ALL_TYPES: NotificationType[] = [
    NotificationType.DEADLINE_REMINDER,
    NotificationType.REENGAGEMENT_REMINDER,
    NotificationType.PROJECT_GRADED,
    NotificationType.DISCUSSION_REPLY,
];

const LABEL_EN: Record<NotificationType, string> = {
    [NotificationType.DEADLINE_REMINDER]: 'Deadline reminders (projects, assignments)',
    [NotificationType.REENGAGEMENT_REMINDER]: 'Re-engagement reminders (learning reminders)',
    [NotificationType.PROJECT_GRADED]: 'Grading and feedback on submissions',
    [NotificationType.DISCUSSION_REPLY]: 'Replies in discussion boards',
};

export type NotificationPreferenceRow = {
    type: NotificationType;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    label: string;
};

export async function listNotificationPreferenceRowsForUser(userId: number): Promise<NotificationPreferenceRow[]> {
    let rows: Array<{ type: NotificationType; inAppEnabled: boolean; emailEnabled: boolean }> = [];
    try {
        rows = await prisma.userNotificationPreference.findMany({ where: { userId } });
    } catch (error) {
        if (!isMissingTableError(error)) {
            throw error;
        }
    }
    const byType = new Map(rows.map((r) => [r.type, r]));

    return ALL_TYPES.map((type) => {
        const row = byType.get(type);
        return {
            type,
            inAppEnabled: row?.inAppEnabled ?? true,
            emailEnabled: row?.emailEnabled ?? true,
            label: LABEL_EN[type],
        };
    });
}

export async function getEffectivePreference(
    userId: number,
    type: NotificationType,
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
    let row: { inAppEnabled: boolean; emailEnabled: boolean } | null = null;
    try {
        row = await prisma.userNotificationPreference.findUnique({
            where: { userId_type: { userId, type } },
        });
    } catch (error) {
        if (!isMissingTableError(error)) {
            throw error;
        }
    }
    return {
        inAppEnabled: row?.inAppEnabled ?? true,
        emailEnabled: row?.emailEnabled ?? true,
    };
}

type PreferenceInput = { type: NotificationType; inAppEnabled: boolean; emailEnabled: boolean };

function isNotificationType(value: unknown): value is NotificationType {
    return typeof value === 'string' && (ALL_TYPES as string[]).includes(value);
}

export async function updateNotificationPreferences(userId: number, items: unknown): Promise<NotificationPreferenceRow[]> {
    if (!Array.isArray(items)) {
        throw new Error('INVALID_PREFERENCES_BODY');
    }

    const normalized: PreferenceInput[] = [];
    for (const raw of items) {
        if (!raw || typeof raw !== 'object') continue;
        const obj = raw as Record<string, unknown>;
        if (!isNotificationType(obj.type)) continue;
        normalized.push({
            type: obj.type,
            inAppEnabled: Boolean(obj.inAppEnabled),
            emailEnabled: Boolean(obj.emailEnabled),
        });
    }

    if (normalized.length === 0) {
        throw new Error('INVALID_PREFERENCES_BODY');
    }

    for (const item of normalized) {
        try {
            await prisma.userNotificationPreference.upsert({
                where: { userId_type: { userId, type: item.type } },
                create: {
                    userId,
                    type: item.type,
                    inAppEnabled: item.inAppEnabled,
                    emailEnabled: item.emailEnabled,
                },
                update: {
                    inAppEnabled: item.inAppEnabled,
                    emailEnabled: item.emailEnabled,
                },
            });
        } catch (error) {
            if (isMissingTableError(error)) {
                throw new Error('NOTIFICATION_TABLE_NOT_READY');
            }
            throw error;
        }
    }

    return listNotificationPreferenceRowsForUser(userId);
}
