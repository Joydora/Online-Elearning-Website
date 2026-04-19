import { Request, Response } from 'express';
import { simpleChatbotService } from '../services/simpleChatbot.service';

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
        });
    }
}

