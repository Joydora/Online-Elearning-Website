import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkoutCourse, handleStripeWebhook, startTrialSetup } from '../services/enroll.service';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

const STUDENT_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3000/payment-success';
const STUDENT_CANCEL_URL = process.env.STRIPE_CANCEL_URL ?? 'http://localhost:3000/payment-cancel';
const TRIAL_SUCCESS_URL = process.env.STRIPE_TRIAL_SUCCESS_URL ?? 'http://localhost:5173/trial-success';
const TRIAL_CANCEL_URL = process.env.STRIPE_TRIAL_CANCEL_URL ?? 'http://localhost:5173/trial-cancel';

export async function checkoutCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const courseId = Number.parseInt(req.params.courseId, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        try {
            const url = await checkoutCourse({
                courseId,
                studentId: authReq.user.userId,
                successUrl: STUDENT_SUCCESS_URL,
                cancelUrl: STUDENT_CANCEL_URL,
            });

            if (!url) {
                return res.status(500).json({ error: 'Unable to create checkout session' });
            }

            return res.status(200).json({ url });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Course not found' });
            }

            if (message === 'ALREADY_ENROLLED') {
                return res.status(409).json({ error: 'You are already enrolled in this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to initiate checkout',
            details: (error as Error).message,
        });
    }
}

export async function startTrialController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const courseId = Number.parseInt(req.params.courseId, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'courseId must be a number' });
        }

        try {
            const url = await startTrialSetup({
                courseId,
                studentId: authReq.user.userId,
                successUrl: TRIAL_SUCCESS_URL,
                cancelUrl: TRIAL_CANCEL_URL,
            });

            if (!url) {
                return res.status(500).json({ error: 'Unable to create trial setup session' });
            }

            return res.status(200).json({ url });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Course not found' });
            }

            if (message === 'TRIAL_NOT_AVAILABLE') {
                return res.status(400).json({ error: 'This course does not offer a free trial' });
            }

            if (message === 'ALREADY_ENROLLED') {
                return res.status(409).json({ error: 'You are already enrolled in this course' });
            }

            if (message === 'USER_NOT_FOUND') {
                return res.status(404).json({ error: 'User not found' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to start trial',
            details: (error as Error).message,
        });
    }
}

type RawBodyRequest = Request & { rawBody?: Buffer };

export async function stripeWebhookController(req: Request, res: Response): Promise<Response> {
    try {
        const signature = req.headers['stripe-signature'];
        const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

        if (!rawBody) {
            return res.status(400).json({ error: 'Missing raw request body for webhook validation' });
        }

        await handleStripeWebhook(rawBody, typeof signature === 'string' ? signature : undefined);

        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(400).json({
            error: 'Webhook processing failed',
            details: (error as Error).message,
        });
    }
}

export async function getMyEnrollmentsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as Request & { user?: AuthenticatedUser };

        if (!authReq.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                studentId: authReq.user.userId,
            },
            select: {
                id: true,
                enrollmentDate: true,
                progress: true,
                completionDate: true,
                type: true,
                expiresAt: true,
                isActive: true,
                studentId: true,
                courseId: true,
                course: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        price: true,
                        trialDurationDays: true,
                        accessDurationDays: true,
                        teacherId: true,
                        categoryId: true,
                        createdAt: true,
                        updatedAt: true,
                        teacher: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                        category: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                enrollmentDate: 'desc',
            },
        });

        return res.status(200).json(enrollments);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch enrollments',
            details: (error as Error).message,
        });
    }
}
