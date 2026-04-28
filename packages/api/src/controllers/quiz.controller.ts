import { Request, Response } from 'express';
import {
    createVideoQuizMarker,
    deleteVideoQuizMarker,
    getQuizAttempts,
    getQuizForStudent,
    getQuizHistory,
    getVideoQuizMarkersForContent,
    submitQuizAnswers,
    submitVideoQuizMarkerAnswer,
} from '../services/quiz.service';
import { AuthenticatedUser } from '../types/auth';

export async function getQuizController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        try {
            const quiz = await getQuizForStudent(contentId, authReq.user.userId);
            return res.status(200).json(quiz);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'QUIZ_NOT_FOUND' || message === 'NOT_A_QUIZ') {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            if (message === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to load quiz',
            details: (error as Error).message,
        });
    }
}

export async function submitQuizController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        try {
            const result = await submitQuizAnswers(contentId, authReq.user.userId, req.body?.answers);
            return res.status(200).json(result);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'QUIZ_NOT_FOUND' || message === 'NOT_A_QUIZ') {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            if (message === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }

            if (message === 'INVALID_ANSWERS') {
                return res.status(400).json({ error: 'answers must be an array of { questionId, answerOptionId }' });
            }

            if (message === 'ANSWER_OPTION_NOT_FOUND') {
                return res.status(400).json({ error: 'Submitted answer references an unknown option' });
            }

            if (message === 'QUIZ_HAS_NO_QUESTIONS') {
                return res.status(400).json({ error: 'Quiz has no questions to grade' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to submit quiz',
            details: (error as Error).message,
        });
    }
}

export async function getQuizHistoryController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const history = await getQuizHistory(authReq.user.userId);
        return res.status(200).json(history);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to load quiz history',
            details: (error as Error).message,
        });
    }
}

export async function getQuizAttemptsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        try {
            const attempts = await getQuizAttempts(contentId, authReq.user.userId);
            return res.status(200).json(attempts);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'QUIZ_NOT_FOUND') {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            if (message === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to load quiz attempts',
            details: (error as Error).message,
        });
    }
}

export async function getContentMarkersController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'content id must be a number' });
        }

        try {
            const markers = await getVideoQuizMarkersForContent(
                contentId,
                authReq.user.userId,
                authReq.user.role
            );
            return res.status(200).json(markers);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'CONTENT_NOT_FOUND' || message === 'NOT_A_VIDEO') {
                return res.status(404).json({ error: 'Video content not found' });
            }

            if (message === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to load video quiz markers',
            details: (error as Error).message,
        });
    }
}

export async function createMarkerController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number(req.body?.contentId);
        const timestampSec = Number(req.body?.timestampSec);
        const questionId = Number(req.body?.questionId);

        if (!Number.isInteger(contentId) || !Number.isInteger(timestampSec) || !Number.isInteger(questionId)) {
            return res.status(400).json({ error: 'contentId, timestampSec, and questionId must be integers' });
        }

        try {
            const marker = await createVideoQuizMarker({
                contentId,
                timestampSec,
                questionId,
                blockingMode: req.body?.blockingMode,
                teacherId: authReq.user.userId,
                userRole: authReq.user.role,
            });

            return res.status(201).json(marker);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'CONTENT_NOT_FOUND' || message === 'NOT_A_VIDEO') {
                return res.status(404).json({ error: 'Video content not found' });
            }

            if (message === 'QUESTION_NOT_FOUND') {
                return res.status(404).json({ error: 'Question not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            if (
                message === 'INVALID_TIMESTAMP' ||
                message === 'QUESTION_NOT_IN_QUIZ' ||
                message === 'QUESTION_COURSE_MISMATCH'
            ) {
                return res.status(400).json({ error: message });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create video quiz marker',
            details: (error as Error).message,
        });
    }
}

export async function deleteMarkerController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const rawMarkerId = req.params.id ?? req.query.id ?? req.body?.id;
        const markerId = Number.parseInt(String(rawMarkerId), 10);

        if (Number.isNaN(markerId)) {
            return res.status(400).json({ error: 'marker id must be a number' });
        }

        try {
            await deleteVideoQuizMarker(markerId, authReq.user.userId, authReq.user.role);
            return res.status(200).json({ message: 'Marker deleted successfully' });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'MARKER_NOT_FOUND') {
                return res.status(404).json({ error: 'Marker not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete video quiz marker',
            details: (error as Error).message,
        });
    }
}

export async function submitMarkerController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const markerId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(markerId)) {
            return res.status(400).json({ error: 'marker id must be a number' });
        }

        try {
            const result = await submitVideoQuizMarkerAnswer(
                markerId,
                authReq.user.userId,
                req.body?.answerOptionId
            );
            return res.status(200).json(result);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'MARKER_NOT_FOUND') {
                return res.status(404).json({ error: 'Marker not found' });
            }

            if (message === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }

            if (message === 'INVALID_ANSWER' || message === 'ANSWER_OPTION_NOT_FOUND') {
                return res.status(400).json({ error: 'Submitted answer references an unknown option' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to submit marker answer',
            details: (error as Error).message,
        });
    }
}
