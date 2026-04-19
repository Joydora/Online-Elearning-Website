import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getEnrollmentProgressController,
    markContentCompleteController,
} from '../controllers/progress.controller';

const router = Router();

router.get(
    '/enrollments/:id/progress',
    isAuthenticated,
    isAuthorized([Role.STUDENT, Role.ADMIN]),
    getEnrollmentProgressController,
);

router.post(
    '/contents/:id/complete',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    markContentCompleteController,
);

export default router;
