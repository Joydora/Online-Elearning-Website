import { Request, Response } from 'express';
import { CourseLevel } from '@prisma/client';
import { recommendLearningPath } from '../services/recommendation.service';

const VALID_LEVELS: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

function parseLevel(raw: unknown): CourseLevel | undefined {
    if (typeof raw !== 'string') return undefined;
    return (VALID_LEVELS as string[]).includes(raw) ? (raw as CourseLevel) : undefined;
}

export async function recommendPathController(req: Request, res: Response): Promise<Response> {
    try {
        const { goal, currentLevel, maxCourses } = (req.body ?? {}) as {
            goal?: unknown;
            currentLevel?: unknown;
            maxCourses?: unknown;
        };

        if (typeof goal !== 'string' || !goal.trim()) {
            return res.status(400).json({ error: 'goal (non-empty string) is required' });
        }
        if (goal.length > 500) {
            return res.status(400).json({ error: 'goal must be ≤ 500 characters' });
        }

        let level: CourseLevel | undefined = undefined;
        if (currentLevel !== undefined && currentLevel !== null && currentLevel !== '') {
            level = parseLevel(currentLevel);
            if (!level) {
                return res
                    .status(400)
                    .json({ error: 'currentLevel must be BEGINNER, INTERMEDIATE, or ADVANCED' });
            }
        }

        let max: number | undefined = undefined;
        if (maxCourses !== undefined && maxCourses !== null && maxCourses !== '') {
            const n = Number(maxCourses);
            if (!Number.isInteger(n) || n < 1 || n > 10) {
                return res.status(400).json({ error: 'maxCourses must be an integer between 1 and 10' });
            }
            max = n;
        }

        const result = await recommendLearningPath({
            goal: goal.trim(),
            currentLevel: level ?? null,
            maxCourses: max,
        });

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to generate learning path',
            details: (error as Error).message,
        });
    }
}
