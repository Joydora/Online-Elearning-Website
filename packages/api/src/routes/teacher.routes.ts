import { Router } from 'express';
import { Role } from '@prisma/client';
import { getTeacherProfileController, getAllTeachersController } from '../controllers/teacher.controller';
import { getMyEarningsController } from '../controllers/revenue.controller';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/teachers', getAllTeachersController);
router.get('/teachers/:id', getTeacherProfileController);

// EPIC 4: Teacher read-only earnings
router.get('/teacher/earnings', isAuthenticated, isAuthorized([Role.TEACHER]), getMyEarningsController);

export default router;

