import { Router } from 'express';
import { Role } from '@prisma/client';
import { checkoutCourseController, stripeWebhookController, getMyEnrollmentsController, startTrialController } from '../controllers/enroll.controller';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';

const router = Router();

router.get('/enroll/my-enrollments', isAuthenticated, isAuthorized([Role.STUDENT]), getMyEnrollmentsController);
router.get('/enroll/courses/:courseId/content', isAuthenticated, isAuthorized([Role.STUDENT, Role.TEACHER, Role.ADMIN]), getCourseContentController);
router.post('/enroll/checkout/:courseId', isAuthenticated, isAuthorized([Role.STUDENT]), checkoutCourseController);
router.post('/enroll/trial/:courseId', isAuthenticated, isAuthorized([Role.STUDENT]), startTrialController);
router.post('/stripe-webhook', stripeWebhookController);

// Teacher routes - View enrolled students
router.get('/courses/:courseId/students', isAuthenticated, isAuthorized([Role.TEACHER]), getEnrolledStudentsController);
router.get('/courses/:courseId/enrollment-stats', isAuthenticated, isAuthorized([Role.TEACHER]), getEnrollmentStatsController);
router.get('/courses/:courseId/students/:studentId/performance', isAuthenticated, isAuthorized([Role.TEACHER]), getStudentPerformanceController);

export default router;
