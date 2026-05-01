import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getPracticeController,
    createPracticeController,
    updatePracticeController,
    submitPracticeController,
    getMySubmissionsController,
} from '../controllers/practice.controller';

const router = Router();

// Get practice for a content
router.get('/practice/content/:contentId', isAuthenticated, getPracticeController);

// Teacher: create/update practice
router.post('/practice', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createPracticeController);
router.put('/practice/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updatePracticeController);

// Student: submit and view submissions
router.post('/practice/:id/submit', isAuthenticated, isAuthorized([Role.STUDENT]), submitPracticeController);
router.get('/practice/:id/submissions/mine', isAuthenticated, isAuthorized([Role.STUDENT]), getMySubmissionsController);

export default router;
