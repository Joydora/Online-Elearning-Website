import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    markContentCompletedController,
    unmarkContentCompletedController,
    getCompletedContentsController,
    getDetailedProgressController,
    getProgressSummaryController,
} from '../controllers/progress.controller';

const router = Router();

// Mark content as completed
router.post(
    '/progress/content/:contentId/complete',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    markContentCompletedController
);

// Unmark content (toggle off)
router.delete(
    '/progress/content/:contentId/complete',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    unmarkContentCompletedController
);

// Get completed contents for a course
router.get(
    '/progress/course/:courseId/completed',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getCompletedContentsController
);

// EPIC 7: detailed progress breakdown
router.get(
    '/progress/course/:courseId/detail',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getDetailedProgressController
);

// EPIC 7: AI-generated progress summary
router.get(
    '/progress/course/:courseId/summary',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getProgressSummaryController
);

export default router;

