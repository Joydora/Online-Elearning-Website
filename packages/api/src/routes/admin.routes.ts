import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
    getAllUsersController,
    updateUserRoleController,
    deleteUserController,
    createUserController,
    getAllCoursesAdminController,
    createCourseAdminController,
    updateCourseAdminController,
    getCourseAdminController,
    deleteCourseAdminController,
    getAdminStatsController,
} from '../controllers/admin.controller';
import {
    listRevenueController,
    markRevenuePaidController,
    getTeacherEarningsController,
} from '../controllers/revenue.controller';

const router = Router();

// All routes require ADMIN role
const adminOnly = [isAuthenticated, isAuthorized([Role.ADMIN])];

// Dashboard stats
router.get('/admin/stats', ...adminOnly, getAdminStatsController);

// Category Management
router.post('/admin/categories', ...adminOnly, createCategoryController);
router.put('/admin/categories/:id', ...adminOnly, updateCategoryController);
router.delete('/admin/categories/:id', ...adminOnly, deleteCategoryController);

// User Management
router.get('/admin/users', ...adminOnly, getAllUsersController);
router.post('/admin/users', ...adminOnly, createUserController);
router.put('/admin/users/:id/role', ...adminOnly, updateUserRoleController);
router.delete('/admin/users/:id', ...adminOnly, deleteUserController);

// Course Management
router.get('/admin/courses', ...adminOnly, getAllCoursesAdminController);
router.post('/admin/courses', ...adminOnly, createCourseAdminController);
router.get('/admin/courses/:id', ...adminOnly, getCourseAdminController);
router.put('/admin/courses/:id', ...adminOnly, updateCourseAdminController);
router.delete('/admin/courses/:id', ...adminOnly, deleteCourseAdminController);

// Revenue
router.get('/admin/revenue', ...adminOnly, listRevenueController);
router.post('/admin/revenue/:id/mark-paid', ...adminOnly, markRevenuePaidController);

// Teacher read-only earnings (on their own ledger)
router.get(
    '/teacher/earnings',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    getTeacherEarningsController,
);

export default router;

