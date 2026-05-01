import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    getProjectsByCourseController,
    createProjectController,
    updateProjectController,
    deleteProjectController,
    submitProjectController,
    refreshCommitsController,
    getSubmissionsController,
    getMySubmissionController,
    gradeSubmissionController,
} from '../controllers/project.controller';

const router = Router();

// Student + Teacher: view projects for a course
router.get('/courses/:courseId/projects', isAuthenticated, getProjectsByCourseController);

// Teacher: manage projects
router.post('/projects', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createProjectController);
router.put('/projects/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), updateProjectController);
router.delete('/projects/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteProjectController);

// Teacher: view all submissions, grade
router.get('/projects/:id/submissions', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), getSubmissionsController);
router.put('/projects/submissions/:submissionId/grade', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), gradeSubmissionController);

// Student: submit + view own submission
router.post('/projects/:id/submit', isAuthenticated, isAuthorized([Role.STUDENT]), submitProjectController);
router.get('/projects/:id/submissions/mine', isAuthenticated, isAuthorized([Role.STUDENT]), getMySubmissionController);
router.post('/projects/submissions/:submissionId/refresh-commits', isAuthenticated, isAuthorized([Role.STUDENT]), refreshCommitsController);

export default router;
