import { Request, Response } from 'express';
import { getQuizForStudent, submitQuizAnswers } from '../services/quiz.service';
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

            if (message === 'ENROLLMENT_EXPIRED') {
                return res.status(403).json({ error: 'Your access to this course has expired' });
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

            if (message === 'ENROLLMENT_EXPIRED') {
                return res.status(403).json({ error: 'Your access to this course has expired' });
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
