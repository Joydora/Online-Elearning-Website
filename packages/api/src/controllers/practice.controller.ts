import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    getPracticeByContent,
    createPractice,
    updatePractice,
    submitPractice,
    getMySubmissions,
} from '../services/practice.service';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

function auth(req: Request) {
    return (req as Request & { user?: AuthenticatedUser }).user;
}

export async function getPracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const contentId = Number(req.params.contentId);
        if (isNaN(contentId)) return res.status(400).json({ error: 'Invalid contentId' });

        const practice = await getPracticeByContent(contentId);
        if (!practice) return res.status(404).json({ error: 'Practice not found' });

        return res.status(200).json(practice);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch practice' });
    }
}

export async function createPracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const { contentId, prompt, starterCode, expectedOutput, rubric, language } = req.body;

        if (!contentId || !prompt) {
            return res.status(400).json({ error: 'contentId and prompt are required' });
        }

        const content = await prisma.content.findUnique({
            where: { id: Number(contentId) },
            include: { module: { include: { course: { select: { teacherId: true } } } } },
        });
        if (!content || content.module.course.teacherId !== user.userId) {
            return res.status(403).json({ error: 'You do not own this course' });
        }

        const practice = await createPractice({ contentId: Number(contentId), prompt, starterCode, expectedOutput, rubric, language });
        return res.status(201).json(practice);
    } catch {
        return res.status(500).json({ error: 'Unable to create practice' });
    }
}

export async function updatePracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

        const { prompt, starterCode, expectedOutput, rubric, language } = req.body;
        const practice = await updatePractice(id, { prompt, starterCode, expectedOutput, rubric, language });
        return res.status(200).json(practice);
    } catch {
        return res.status(500).json({ error: 'Unable to update practice' });
    }
}

export async function submitPracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const practiceId = Number(req.params.id);
        if (isNaN(practiceId)) return res.status(400).json({ error: 'Invalid practiceId' });

        const { submittedCode } = req.body;
        if (!submittedCode || typeof submittedCode !== 'string') {
            return res.status(400).json({ error: 'submittedCode is required' });
        }

        const result = await submitPractice({ practiceId, studentId: user.userId, submittedCode });
        return res.status(201).json(result);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg === 'PRACTICE_NOT_FOUND') return res.status(404).json({ error: 'Practice not found' });
        if (msg === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled in this course' });
        return res.status(500).json({ error: 'Unable to submit practice' });
    }
}

export async function getMySubmissionsController(req: Request, res: Response): Promise<Response> {
    try {
        const user = auth(req);
        if (!user) return res.status(401).json({ error: 'Not authenticated' });

        const practiceId = Number(req.params.id);
        if (isNaN(practiceId)) return res.status(400).json({ error: 'Invalid practiceId' });

        const submissions = await getMySubmissions(practiceId, user.userId);
        return res.status(200).json(submissions);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch submissions' });
    }
}
