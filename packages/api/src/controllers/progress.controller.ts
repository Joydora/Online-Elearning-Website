import { Request, Response } from 'express';
import { AuthenticatedUser } from '../types/auth';
import {
    computeProgress,
    refreshEnrollmentProgress,
    summariseProgress,
} from '../services/progress.service';
import { prisma } from '../lib/prisma';

type AuthRequest = Request & { user?: AuthenticatedUser };

export async function getEnrollmentProgressController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const enrollmentId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(enrollmentId)) {
            return res.status(400).json({ error: 'Enrollment id must be a number' });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            select: { studentId: true },
        });
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

        // Student must own the enrollment; admin can read any.
        if (authReq.user.role !== 'ADMIN' && enrollment.studentId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Not your enrollment' });
        }

        const progress = await computeProgress(enrollmentId);
        if (!progress) return res.status(404).json({ error: 'Enrollment vanished' });

        return res.status(200).json(progress);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch progress',
            details: (error as Error).message,
        });
    }
}

export async function getEnrollmentSummaryController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const enrollmentId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(enrollmentId)) {
            return res.status(400).json({ error: 'Enrollment id must be a number' });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            select: { studentId: true },
        });
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
        if (authReq.user.role !== 'ADMIN' && enrollment.studentId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Not your enrollment' });
        }

        const summary = await summariseProgress(enrollmentId);
        if (!summary) return res.status(404).json({ error: 'Enrollment vanished' });
        return res.status(200).json(summary);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to summarise progress',
            details: (error as Error).message,
        });
    }
}

export async function markContentCompleteController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const contentId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'Content id must be a number' });
        }

        const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: { id: true, contentType: true, module: { select: { courseId: true } } },
        });
        if (!content) return res.status(404).json({ error: 'Content not found' });

        // Only VIDEO/DOCUMENT use this endpoint — QUIZ and PRACTICE flow through
        // their own submit paths and the progress service infers completion from scores.
        if (content.contentType !== 'VIDEO' && content.contentType !== 'DOCUMENT') {
            return res.status(400).json({
                error: 'Only VIDEO and DOCUMENT contents use the manual completion endpoint',
            });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_courseId: {
                    studentId: authReq.user.userId,
                    courseId: content.module.courseId,
                },
            },
            select: { id: true, isActive: true, expiresAt: true },
        });
        if (!enrollment) return res.status(403).json({ error: 'You are not enrolled in this course' });
        if (!enrollment.isActive || (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now())) {
            return res.status(403).json({ error: 'Your access to this course has expired' });
        }

        // Idempotent via the unique index — just upsert.
        await prisma.contentCompletion.upsert({
            where: {
                studentId_contentId: {
                    studentId: authReq.user.userId,
                    contentId,
                },
            },
            create: { studentId: authReq.user.userId, contentId },
            update: {},
        });

        // Best-effort refresh of Enrollment.progress. T7.4 will hook this into more places.
        try {
            await refreshEnrollmentProgress(enrollment.id);
        } catch (err) {
            console.error(`refreshEnrollmentProgress(${enrollment.id}) failed:`, (err as Error).message);
        }

        return res.status(201).json({ contentId, completed: true });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to mark content complete',
            details: (error as Error).message,
        });
    }
}
