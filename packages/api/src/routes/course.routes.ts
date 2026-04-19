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
    getContentController,
    getCourseDetailController,
    getCoursesController,
    updateCourseController,
} from '../controllers/course.controller';
import { isAuthenticated, isAuthorized, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/categories', getCategoriesController);
router.get('/courses', getCoursesController);
router.get('/courses/:id', getCourseDetailController);
router.get('/contents/:id', optionalAuth, getContentController);

router.post('/courses', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createCourseController);
router.put('/courses/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateCourseController);
router.delete('/courses/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteCourseController);

router.post('/modules', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createModuleController);
router.delete('/modules/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteModuleController);

router.post('/content', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createContentController);
router.delete('/content/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteContentController);

export default router;
