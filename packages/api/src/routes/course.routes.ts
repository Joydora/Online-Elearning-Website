import { Router } from 'express';
import { Role } from '@prisma/client';
import {
    createContentController,
    createCourseController,
    createModuleController,
    deleteContentController,
    deleteCourseController,
    deleteModuleController,
    getCategoriesController,
    getCourseDetailController,
    getCoursesController,
    getFreePreviewContentController,
    getMyCoursesController,
    submitForReviewController,
    updateContentPreviewController,
    updateCourseController,
    updateModuleController,
    updateContentController,
} from '../controllers/course.controller';
import { isAuthenticated, isAuthorized, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/categories', getCategoriesController);
router.get('/courses', getCoursesController);
router.get('/courses/:courseId/preview/:contentId', getFreePreviewContentController);
router.get('/courses/:id', optionalAuth, getCourseDetailController);
router.get('/teacher/courses', isAuthenticated, isAuthorized([Role.TEACHER]), getMyCoursesController);

router.post('/courses', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createCourseController);
router.put('/courses/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateCourseController);
router.delete('/courses/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteCourseController);

// EPIC 2: Submit course for admin review
router.post('/courses/:id/submit', isAuthenticated, isAuthorized([Role.TEACHER]), submitForReviewController);

router.post('/modules', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createModuleController);
router.put('/modules/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateModuleController);
router.delete('/modules/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteModuleController);

router.post('/content', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createContentController);
router.put('/content/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateContentController);
router.patch('/content/:id/preview', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateContentPreviewController);
router.delete('/content/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteContentController);

export default router;
