import { Request, Response } from 'express';
import { CourseLevel } from '@prisma/client';
import { recommendLearningPath } from '../services/recommend.service';
import { AuthenticatedUser } from '../types/auth';

export async function recommendPathController(req: Request, res: Response): Promise<Response> {
    try {
        const { goal, currentLevel } = req.body as { goal: string; currentLevel: string };

        if (!goal || typeof goal !== 'string' || goal.trim().length < 3) {
            return res.status(400).json({ error: 'goal must be at least 3 characters' });
        }

        const validLevels: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
        const level: CourseLevel = validLevels.includes(currentLevel as CourseLevel)
            ? (currentLevel as CourseLevel)
            : 'BEGINNER';

        const authReq = req as Request & { user?: AuthenticatedUser };
        const studentId = authReq.user?.userId;

        const result = await recommendLearningPath({ goal: goal.trim(), currentLevel: level, studentId });

        return res.status(200).json(result);
    } catch {
        return res.status(500).json({ error: 'Unable to generate recommendations' });
    }
}
