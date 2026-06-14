import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getPracticeController,
    submitPracticeController,
    listMyPracticeAttemptsController,
} from '../controllers/practice.controller';

const router = Router();

router.get(
    '/practice/:contentId',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getPracticeController,
);
router.post(
    '/practice/:contentId/submit',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    submitPracticeController,
);
router.get(
    '/practice/:contentId/attempts',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    listMyPracticeAttemptsController,
);

export default router;
