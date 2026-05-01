import { Request, Response } from 'express';
import {
    markContentCompleted,
    getCompletedContents,
    unmarkContentCompleted,
    getDetailedProgress,
    getProgressAISummary,
} from '../services/progress.service';
import { AuthenticatedUser } from '../types/auth';

function auth(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

export async function markContentCompletedController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const contentId = Number.parseInt(req.params.contentId, 10);
        if (Number.isNaN(contentId)) return res.status(400).json({ error: 'contentId must be a number' });

        const { watchedSeconds } = req.body;
        const result = await markContentCompleted(contentId, user.userId, watchedSeconds);
        return res.status(200).json(result);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'CONTENT_NOT_FOUND') return res.status(404).json({ error: 'Content not found' });
        if (message === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled in this course' });
        if (message === 'ENROLLMENT_EXPIRED') return res.status(403).json({ error: 'Enrollment has expired' });
        return res.status(500).json({ error: 'Unable to mark content as completed' });
    }
}

export async function unmarkContentCompletedController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const contentId = Number.parseInt(req.params.contentId, 10);
        if (Number.isNaN(contentId)) return res.status(400).json({ error: 'contentId must be a number' });

        const result = await unmarkContentCompleted(contentId, user.userId);
        return res.status(200).json(result);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'CONTENT_NOT_FOUND') return res.status(404).json({ error: 'Content not found' });
        if (message === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled in this course' });
        return res.status(500).json({ error: 'Unable to unmark content' });
    }
}

export async function getCompletedContentsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        const completedContentIds = await getCompletedContents(courseId, user.userId);
        return res.status(200).json({ completedContentIds });
    } catch {
        return res.status(500).json({ error: 'Unable to get completed contents' });
    }
}

// EPIC 7: detailed breakdown
export async function getDetailedProgressController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        const detail = await getDetailedProgress(courseId, user.userId);
        return res.status(200).json(detail);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled' });
        return res.status(500).json({ error: 'Unable to get progress' });
    }
}

// EPIC 7: AI summary
export async function getProgressSummaryController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        const summary = await getProgressAISummary(courseId, user.userId);
        return res.status(200).json({ summary });
    } catch {
        return res.status(500).json({ error: 'Unable to generate summary' });
    }
}
