import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

type NotificationItem = {
    id: number;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
};

export default function Notifications() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/notifications/me?page=1&pageSize=50');
            setItems(response.data.items || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await apiClient.patch(`/notifications/${id}/read`);
            setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.patch('/notifications/read-all');
            setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Thong bao</h1>
                <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
                    Danh dau tat ca da doc ({unreadCount})
                </Button>
            </div>

            {loading ? (
                <p className="text-zinc-600 dark:text-zinc-300">Dang tai thong bao...</p>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-zinc-600 dark:text-zinc-300">Ban chua co thong bao nao.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <Card key={item.id} className={item.isRead ? 'opacity-80' : 'border-red-500/50'}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center justify-between gap-3">
                                    <span>{item.title}</span>
                                    {!item.isRead && (
                                        <Button size="sm" variant="outline" onClick={() => markAsRead(item.id)}>
                                            Da doc
                                        </Button>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-zinc-700 dark:text-zinc-300 mb-3">{item.message}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span>
                                    {item.link && (
                                        <Link to={item.link} className="text-red-600 hover:underline">
                                            Xem chi tiet
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

