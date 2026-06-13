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
    setProjectRubricController,
    getProjectRubricController,
    submitSelfAssessmentController,
    getMyPeerReviewAssignmentsController,
    getPeerReviewAssignmentDetailsController,
    submitPeerReviewController,
    getSubmissionReviewsController,
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

// Rubrics
router.post('/projects/:id/rubric', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), setProjectRubricController);
router.get('/projects/:id/rubric', isAuthenticated, getProjectRubricController);

// Self Assessment
router.post('/projects/submissions/:submissionId/self-assessment', isAuthenticated, isAuthorized([Role.STUDENT]), submitSelfAssessmentController);

// Peer Reviews (Assigned to current user)
router.get('/projects/:id/peer-reviews/assigned', isAuthenticated, isAuthorized([Role.STUDENT]), getMyPeerReviewAssignmentsController);
router.get('/projects/peer-reviews/:assignmentId', isAuthenticated, isAuthorized([Role.STUDENT]), getPeerReviewAssignmentDetailsController);
router.post('/projects/peer-reviews/:assignmentId/submit', isAuthenticated, isAuthorized([Role.STUDENT]), submitPeerReviewController);

// View reviews (Self Assessment & Peer Reviews) for a submission
router.get('/projects/submissions/:submissionId/reviews', isAuthenticated, getSubmissionReviewsController);

export default router;
