import { Router } from 'express';
import { Role } from '@prisma/client';
import { checkoutCourseController, trialEnrollController, stripeWebhookController, getMyEnrollmentsController, getCourseContentController, confirmEnrollmentController } from '../controllers/enroll.controller';
import { getEnrolledStudentsController, getEnrollmentStatsController, getStudentPerformanceController } from '../controllers/enrollment.controller';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';

const router = Router();

router.get('/enroll/my-enrollments', isAuthenticated, isAuthorized([Role.STUDENT]), getMyEnrollmentsController);
router.get('/enroll/courses/:courseId/content', isAuthenticated, isAuthorized([Role.STUDENT]), getCourseContentController);
router.post('/enroll/checkout/:courseId', isAuthenticated, isAuthorized([Role.STUDENT]), checkoutCourseController);
router.post('/enroll/trial/:courseId', isAuthenticated, isAuthorized([Role.STUDENT]), trialEnrollController);
// DEV ONLY — disabled in production
if (process.env.NODE_ENV !== 'production') {
    router.post('/enroll/confirm/:courseId', isAuthenticated, isAuthorized([Role.ADMIN]), confirmEnrollmentController);
}
router.post('/stripe-webhook', stripeWebhookController);

// Teacher routes - View enrolled students
router.get('/courses/:courseId/students', isAuthenticated, isAuthorized([Role.TEACHER]), getEnrolledStudentsController);
router.get('/courses/:courseId/enrollment-stats', isAuthenticated, isAuthorized([Role.TEACHER]), getEnrollmentStatsController);
router.get('/courses/:courseId/students/:studentId/performance', isAuthenticated, isAuthorized([Role.TEACHER]), getStudentPerformanceController);

export default router;
