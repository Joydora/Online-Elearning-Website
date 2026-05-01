import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkoutCourse, handleStripeWebhook, getCourseForEnrolledStudent } from '../services/enroll.service';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

const STUDENT_SUCCESS_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/payment-success`
    : 'http://localhost:5173/payment-success';
const STUDENT_CANCEL_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/payment-cancel`
    : 'http://localhost:5173/payment-cancel';

export async function checkoutCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        const promotionCode = req.body?.promotionCode as string | undefined;

        try {
            const url = await checkoutCourse({
                courseId,
                studentId: authReq.user.userId,
                successUrl: STUDENT_SUCCESS_URL,
                cancelUrl: STUDENT_CANCEL_URL,
                promotionCode,
            });

            if (!url) return res.status(500).json({ error: 'Unable to create checkout session' });
            return res.status(200).json({ url });
        } catch (error) {
            const message = (error as Error).message;
            if (message === 'COURSE_NOT_FOUND') return res.status(404).json({ error: 'Course not found' });
            if (message === 'ALREADY_ENROLLED') return res.status(409).json({ error: 'Already enrolled' });
            throw error;
        }
    } catch {
        return res.status(500).json({ error: 'Unable to initiate checkout' });
    }
}

// EPIC 1: Trial enrollment
export async function trialEnrollController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        try {
            await checkoutCourse({
                courseId,
                studentId: authReq.user.userId,
                successUrl: '',
                cancelUrl: '',
                trial: true,
            });
            return res.status(201).json({ message: 'Trial enrollment created' });
        } catch (error) {
            const message = (error as Error).message;
            if (message === 'COURSE_NOT_FOUND') return res.status(404).json({ error: 'Course not found' });
            if (message === 'ALREADY_ENROLLED') return res.status(409).json({ error: 'Already enrolled' });
            if (message === 'TRIAL_NOT_AVAILABLE') return res.status(400).json({ error: 'Trial not available for this course' });
            throw error;
        }
    } catch {
        return res.status(500).json({ error: 'Unable to create trial enrollment' });
    }
}

type RawBodyRequest = Request & { rawBody?: Buffer };

export async function stripeWebhookController(req: Request, res: Response): Promise<Response> {
    try {
        const signature = req.headers['stripe-signature'];
        const rawBody = (req as RawBodyRequest).rawBody;
        if (!rawBody) return res.status(400).json({ error: 'Missing raw request body' });

        await handleStripeWebhook(rawBody, typeof signature === 'string' ? signature : undefined);
        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(400).json({ error: 'Webhook processing failed', details: (error as Error).message });
    }
}

export async function getMyEnrollmentsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: authReq.user.userId },
            include: {
                course: {
                    include: {
                        teacher: { select: { id: true, username: true, firstName: true, lastName: true } },
                        category: true,
                    },
                },
            },
            orderBy: { enrollmentDate: 'desc' },
        });

        return res.status(200).json(enrollments);
    } catch {
        return res.status(500).json({ error: 'Unable to fetch enrollments' });
    }
}

export async function confirmEnrollmentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const existing = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId: authReq.user.userId, courseId } },
        });
        if (existing) return res.status(200).json({ message: 'Already enrolled', enrollment: existing });

        const enrollment = await prisma.enrollment.create({
            data: { studentId: authReq.user.userId, courseId, isActive: true },
        });

        return res.status(201).json({ message: 'Enrollment confirmed', enrollment });
    } catch {
        return res.status(500).json({ error: 'Unable to confirm enrollment' });
    }
}

export async function getCourseContentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const courseId = Number.parseInt(req.params.courseId, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'courseId must be a number' });

        try {
            const courseData = await getCourseForEnrolledStudent(courseId, authReq.user.userId);
            return res.status(200).json(courseData);
        } catch (error) {
            const message = (error as Error).message;
            if (message === 'NOT_ENROLLED') return res.status(403).json({ error: 'Not enrolled in this course' });
            if (message === 'ENROLLMENT_EXPIRED') return res.status(403).json({ error: 'Enrollment has expired', code: 'ENROLLMENT_EXPIRED' });
            if (message === 'COURSE_NOT_FOUND') return res.status(404).json({ error: 'Course not found' });
            throw error;
        }
    } catch {
        return res.status(500).json({ error: 'Unable to fetch course content' });
    }
}
