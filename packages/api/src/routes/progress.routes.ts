import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getEnrollmentProgressController,
    getEnrollmentSummaryController,
    markContentCompleteController,
} from '../controllers/progress.controller';

const router = Router();

router.get(
    '/enrollments/:id/progress',
    isAuthenticated,
    isAuthorized([Role.STUDENT, Role.ADMIN]),
    getEnrollmentProgressController,
);

router.get(
    '/enrollments/:id/summary',
    isAuthenticated,
    isAuthorized([Role.STUDENT, Role.ADMIN]),
    getEnrollmentSummaryController,
);

router.post(
    '/contents/:id/complete',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    markContentCompleteController,
);

export default router;
