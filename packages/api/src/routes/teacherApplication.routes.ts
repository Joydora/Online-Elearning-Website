import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getMyApplication,
    getAllApplicationsAdmin,
    approveApplication,
    rejectApplication,
    applyToBecomeTeacher,
} from '../controllers/teacherApplication.controller';

const router = Router();

// Student/Applicant routes (authenticated)
router.get('/teacher-applications/my', isAuthenticated, getMyApplication);
router.post('/teacher-applications', isAuthenticated, applyToBecomeTeacher);

// Admin-only review routes
const adminOnly = [isAuthenticated, isAuthorized([Role.ADMIN])];

router.get('/admin/teacher-applications', ...adminOnly, getAllApplicationsAdmin);
router.post('/admin/teacher-applications/:id/approve', ...adminOnly, approveApplication);
router.post('/admin/teacher-applications/:id/reject', ...adminOnly, rejectApplication);

export default router;
