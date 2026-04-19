import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';
import { gradePractice } from '../services/practice.service';

const prisma = new PrismaClient();

type AuthRequest = Request & { user?: AuthenticatedUser };

async function assertActiveEnrollment(studentId: number, courseId: number): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        select: { isActive: true, expiresAt: true },
    });
    if (!enrollment) {
        throw new Error('NOT_ENROLLED');
    }
    if (!enrollment.isActive) {
        throw new Error('ENROLLMENT_EXPIRED');
    }
    if (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now()) {
        throw new Error('ENROLLMENT_EXPIRED');
    }
}

async function loadPracticeWithCourse(contentId: number) {
    return prisma.practice.findUnique({
        where: { contentId },
        include: {
            content: {
                select: {
                    id: true,
                    title: true,
                    contentType: true,
                    module: { select: { courseId: true } },
                },
            },
        },
    });
}

export async function getPracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);
        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        const practice = await loadPracticeWithCourse(contentId);
        if (!practice) {
            return res.status(404).json({ error: 'Practice not found' });
        }

        try {
            await assertActiveEnrollment(authReq.user.userId, practice.content.module.courseId);
        } catch (err) {
            const msg = (err as Error).message;
            if (msg === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }
            if (msg === 'ENROLLMENT_EXPIRED') {
                return res.status(403).json({ error: 'Your access to this course has expired' });
            }
            throw err;
        }

        const latestSubmission = await prisma.practiceSubmission.findFirst({
            where: { studentId: authReq.user.userId, practiceId: practice.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            id: practice.id,
            contentId: practice.contentId,
            title: practice.content.title,
            prompt: practice.prompt,
            starterCode: practice.starterCode,
            expectedOutput: practice.expectedOutput,
            language: practice.language,
            latestSubmission,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch practice',
            details: (error as Error).message,
        });
    }
}

export async function submitPracticeController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);
        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        const { code } = (req.body ?? {}) as { code?: string };
        if (typeof code !== 'string') {
            return res.status(400).json({ error: 'code (string) is required' });
        }

        const practice = await loadPracticeWithCourse(contentId);
        if (!practice) {
            return res.status(404).json({ error: 'Practice not found' });
        }

        try {
            await assertActiveEnrollment(authReq.user.userId, practice.content.module.courseId);
        } catch (err) {
            const msg = (err as Error).message;
            if (msg === 'NOT_ENROLLED') {
                return res.status(403).json({ error: 'You are not enrolled in this course' });
            }
            if (msg === 'ENROLLMENT_EXPIRED') {
                return res.status(403).json({ error: 'Your access to this course has expired' });
            }
            throw err;
        }

        const grade = await gradePractice({
            prompt: practice.prompt,
            studentCode: code,
            expectedOutput: practice.expectedOutput,
            language: practice.language,
        });

        const submission = await prisma.practiceSubmission.create({
            data: {
                practiceId: practice.id,
                studentId: authReq.user.userId,
                submittedCode: code,
                aiScore: grade.score,
                aiFeedback: grade.feedback,
            },
        });

        return res.status(201).json({
            id: submission.id,
            practiceId: submission.practiceId,
            submittedCode: submission.submittedCode,
            aiScore: submission.aiScore,
            aiFeedback: submission.aiFeedback,
            createdAt: submission.createdAt,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to submit practice',
            details: (error as Error).message,
        });
    }
}

export async function listMyPracticeAttemptsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);
        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        const practice = await prisma.practice.findUnique({
            where: { contentId },
            select: { id: true },
        });
        if (!practice) {
            return res.status(404).json({ error: 'Practice not found' });
        }

        const attempts = await prisma.practiceSubmission.findMany({
            where: { studentId: authReq.user.userId, practiceId: practice.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return res.status(200).json({ attempts });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to list attempts',
            details: (error as Error).message,
        });
    }
}
