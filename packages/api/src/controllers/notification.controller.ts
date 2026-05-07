import { Request, Response } from 'express';
import { tryGetAuthenticatedUser } from '../middleware/auth.middleware';
import { AuthenticatedUser } from '../types/auth';
import {
    getUnreadCountForUser,
    listMyNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '../services/notification.service';
import { addNotificationSseClient } from '../services/notificationHub';
import {
    listNotificationPreferenceRowsForUser,
    updateNotificationPreferences,
} from '../services/notificationPreference.service';

function getUser(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

export async function notificationStreamController(req: Request, res: Response): Promise<void> {
    const user = tryGetAuthenticatedUser(req);
    if (!user) {
        res.status(401).type('text/plain').send('Unauthorized');
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const resWithFlush = res as Response & { flushHeaders?: () => void };
    if (typeof resWithFlush.flushHeaders === 'function') {
        resWithFlush.flushHeaders();
    }

    const unsubscribe = addNotificationSseClient(user.userId, res);

    const unreadCount = await getUnreadCountForUser(user.userId);
    res.write(`data: ${JSON.stringify({ unreadCount })}\n\n`);

    const keepAlive = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch {
            // ignore
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(keepAlive);
        unsubscribe();
    });
}

export async function getMyNotificationsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const page = Number(req.query.page ?? 1);
        const pageSize = Number(req.query.pageSize ?? 20);
        const data = await listMyNotifications(user.userId, page, pageSize);
        return res.status(200).json(data);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch notifications' });
    }
}

export async function markNotificationReadController(req: Request, res: Response): Promise<Response> {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const notificationId = Number(req.params.id);
        if (isNaN(notificationId)) return res.status(400).json({ error: 'Invalid notification id' });

        const result = await markNotificationRead(user.userId, notificationId);
        return res.status(200).json(result);
    } catch (error) {
        if ((error as Error).message === 'NOTIFICATION_NOT_FOUND') {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if ((error as Error).message === 'NOTIFICATION_TABLE_NOT_READY') {
            return res.status(503).json({ error: 'Notification system is not ready yet' });
        }
        return res.status(500).json({ error: 'Unable to mark notification as read' });
    }
}

export async function markAllNotificationsReadController(req: Request, res: Response): Promise<Response> {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const result = await markAllNotificationsRead(user.userId);
        return res.status(200).json(result);
    } catch {
        return res.status(500).json({ error: 'Unable to mark all notifications as read' });
    }
}

export async function getNotificationPreferencesController(req: Request, res: Response): Promise<Response> {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const preferences = await listNotificationPreferenceRowsForUser(user.userId);
        return res.status(200).json({ preferences });
    } catch {
        return res.status(500).json({ error: 'Unable to fetch notification preferences' });
    }
}

export async function putNotificationPreferencesController(req: Request, res: Response): Promise<Response> {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const body = req.body as { preferences?: unknown };
        const preferences = await updateNotificationPreferences(user.userId, body.preferences);
        return res.status(200).json({ preferences });
    } catch (error) {
        if ((error as Error).message === 'INVALID_PREFERENCES_BODY') {
            return res.status(400).json({ error: 'Invalid preferences payload' });
        }
        if ((error as Error).message === 'NOTIFICATION_TABLE_NOT_READY') {
            return res.status(503).json({ error: 'Notification system is not ready yet' });
        }
        return res.status(500).json({ error: 'Unable to update notification preferences' });
    }
}
