import type { Response } from 'express';

const clientsByUser = new Map<number, Set<Response>>();

export function addNotificationSseClient(userId: number, res: Response): () => void {
    let set = clientsByUser.get(userId);
    if (!set) {
        set = new Set();
        clientsByUser.set(userId, set);
    }
    set.add(res);
    return () => {
        const current = clientsByUser.get(userId);
        if (!current) return;
        current.delete(res);
        if (current.size === 0) {
            clientsByUser.delete(userId);
        }
    };
}

export function emitNotificationUnreadCount(userId: number, unreadCount: number): void {
    const set = clientsByUser.get(userId);
    if (!set || set.size === 0) return;

    const payload = `data: ${JSON.stringify({ unreadCount })}\n\n`;
    for (const res of set) {
        try {
            res.write(payload);
        } catch {
            // broken pipe / client gone
        }
    }
}
