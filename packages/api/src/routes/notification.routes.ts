import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import {
    getMyNotificationsController,
    getNotificationPreferencesController,
    markAllNotificationsReadController,
    markNotificationReadController,
    notificationStreamController,
    putNotificationPreferencesController,
} from '../controllers/notification.controller';

const router = Router();

router.get('/notifications/stream', notificationStreamController);
router.get('/notifications/me', isAuthenticated, getMyNotificationsController);
router.get('/notifications/preferences', isAuthenticated, getNotificationPreferencesController);
router.put('/notifications/preferences', isAuthenticated, putNotificationPreferencesController);
router.patch('/notifications/read-all', isAuthenticated, markAllNotificationsReadController);
router.patch('/notifications/:id/read', isAuthenticated, markNotificationReadController);

export default router;
