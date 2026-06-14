import { Router } from 'express';
import { Role } from '@prisma/client';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import {
    createProjectController,
    updateProjectController,
    deleteProjectController,
    listCourseProjectsController,
    submitProjectController,
    getMySubmissionController,
    listProjectSubmissionsController,
    refreshSubmissionCommitsController,
    gradeSubmissionController,
} from '../controllers/project.controller';

const router = Router();

// Course-scoped project list (anyone authenticated — student needs to see, teacher needs to see).
router.get('/courses/:id/projects', isAuthenticated, listCourseProjectsController);

// Teacher writes on a course
router.post(
    '/courses/:id/projects',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    createProjectController,
);

// Teacher writes on a project directly
router.put(
    '/projects/:id',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    updateProjectController,
);
router.delete(
    '/projects/:id',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    deleteProjectController,
);

// Student
router.post(
    '/projects/:id/submit',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    submitProjectController,
);
router.get(
    '/projects/:id/my-submission',
    isAuthenticated,
    isAuthorized([Role.STUDENT]),
    getMySubmissionController,
);

// Teacher review
router.get(
    '/projects/:id/submissions',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    listProjectSubmissionsController,
);
router.post(
    '/submissions/:id/refresh',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    refreshSubmissionCommitsController,
);
router.put(
    '/submissions/:id/grade',
    isAuthenticated,
    isAuthorized([Role.TEACHER, Role.ADMIN]),
    gradeSubmissionController,
);

export default router;
