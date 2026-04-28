import { Router } from 'express';
import { Role } from '@prisma/client';
import {
    createMarkerController,
    deleteMarkerController,
    getContentMarkersController,
    getQuizAttemptsController,
    getQuizController,
    getQuizHistoryController,
    submitMarkerController,
    submitQuizController,
} from '../controllers/quiz.controller';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';

const router = Router();

// Get all quiz attempts history for current student
router.get('/quiz/history', isAuthenticated, isAuthorized([Role.STUDENT]), getQuizHistoryController);

// Video quiz markers
router.get('/contents/:id/markers', isAuthenticated, getContentMarkersController);
router.post('/markers', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), createMarkerController);
router.delete('/markers/:id', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteMarkerController);
router.delete('/markers', isAuthenticated, isAuthorized([Role.TEACHER, Role.ADMIN]), deleteMarkerController);
router.post('/markers/:id/submit', isAuthenticated, isAuthorized([Role.STUDENT]), submitMarkerController);

// Get attempts for a specific quiz
router.get('/quiz/:contentId/attempts', isAuthenticated, isAuthorized([Role.STUDENT]), getQuizAttemptsController);

// Get quiz questions
router.get('/quiz/:contentId', isAuthenticated, isAuthorized([Role.STUDENT]), getQuizController);

// Submit quiz answers
router.post('/quiz/submit/:contentId', isAuthenticated, isAuthorized([Role.STUDENT]), submitQuizController);

export default router;
