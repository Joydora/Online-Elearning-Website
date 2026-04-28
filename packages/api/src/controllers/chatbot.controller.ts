import { Request, Response } from 'express';
import { simpleChatbotService } from '../services/simpleChatbot.service';
import { ragService } from '../services/rag.service';
import { AuthenticatedUser } from '../types/auth';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/**
 * Initialize chatbot with course data
 */
export async function initializeVectorStoreController(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        await simpleChatbotService.initialize();

        return res.status(200).json({
            message: 'Chatbot initialized successfully',
            stats: simpleChatbotService.getStats(),
        });
    } catch (error) {
        console.error('Error initializing chatbot:', error);
        return res.status(500).json({
            error: 'Failed to initialize chatbot',
            details: (error as Error).message,
        });
    }
}

/**
 * Ask a question and get an answer
 */
export async function askQuestionController(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({
                error: 'Question is required and must be a string',
            });
        }

        const answer = await simpleChatbotService.generateAnswer(question);

        return res.status(200).json({ answer });
    } catch (error) {
        console.error('Error generating answer:', error);
        return res.status(500).json({
            error: 'Failed to generate answer',
            details: (error as Error).message,
        });
    }
}

/**
 * Ask a question and stream the answer
 */
export async function askQuestionStreamController(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            res.status(400).json({
                error: 'Question is required and must be a string',
            });
            return;
        }

        // Set headers for SSE (Server-Sent Events)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream the response
        const stream = simpleChatbotService.streamAnswer(question);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Error streaming answer:', error);
        res.status(500).json({
            error: 'Failed to stream answer',
            details: (error as Error).message,
        });
    }
}

/**
 * Get chatbot statistics
 */
export async function getVectorStoreStatsController(
    req: Request,
    res: Response
): Promise<Response> {
    try {
        return res.status(200).json(simpleChatbotService.getStats());
    } catch (error) {
        console.error('Error getting chatbot stats:', error);
        return res.status(500).json({
            error: 'Failed to get chatbot stats',
            details: (error as Error).message,
        });
    }
}

export async function askTeachingAssistantController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const courseId = Number.parseInt(req.params.courseId, 10);
        const { question, currentContentId } = req.body ?? {};

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'question is required and must be a string' });
        }

        const parsedContentId =
            currentContentId !== undefined && currentContentId !== null
                ? Number(currentContentId)
                : undefined;

        if (parsedContentId !== undefined && !Number.isInteger(parsedContentId)) {
            return res.status(400).json({ error: 'currentContentId must be a number when provided' });
        }

        const result = await ragService.askTeachingAssistant({
            courseId,
            question,
            currentContentId: parsedContentId,
            userId: authReq.user.userId,
            role: authReq.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'COURSE_NOT_FOUND') {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (message === 'COURSE_FORBIDDEN') {
            return res.status(403).json({ error: 'You do not have access to this course' });
        }

        if (message === 'CONTENT_NOT_IN_COURSE') {
            return res.status(400).json({ error: 'Current content does not belong to this course' });
        }

        console.error('Error in teaching assistant:', error);
        return res.status(500).json({
            error: 'Failed to generate teaching assistant answer',
            details: message,
        });
    }
}

export async function generateQuizSuggestionsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const courseId = Number.parseInt(req.params.courseId, 10);
        const { currentContentId } = req.body ?? {};

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        const parsedContentId =
            currentContentId !== undefined && currentContentId !== null
                ? Number(currentContentId)
                : undefined;

        if (parsedContentId !== undefined && !Number.isInteger(parsedContentId)) {
            return res.status(400).json({ error: 'currentContentId must be a number when provided' });
        }

        const result = await ragService.generateQuizSuggestions({
            courseId,
            currentContentId: parsedContentId,
            userId: authReq.user.userId,
            role: authReq.user.role,
        });

        return res.status(200).json(result);
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'COURSE_NOT_FOUND') {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (message === 'COURSE_FORBIDDEN') {
            return res.status(403).json({ error: 'You do not have access to this course' });
        }

        if (message === 'CONTENT_NOT_IN_COURSE') {
            return res.status(400).json({ error: 'Current content does not belong to this course' });
        }

        console.error('Error generating quiz suggestions:', error);
        return res.status(500).json({
            error: 'Failed to generate quiz suggestions',
            details: message,
        });
    }
}

