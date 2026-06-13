import crypto from 'crypto';
import { Request, Response } from 'express';
import { CourseStatus, EnrollmentType, PayoutStatus, PrismaClient } from '@prisma/client';
import { checkoutCourse, handleStripeWebhook, getCourseForEnrolledStudent, calculateRevenueSplit } from '../services/enroll.service';
import { calculateDiscount } from '../services/promotion.service';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

const STUDENT_SUCCESS_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/payment-success`
    : 'http://localhost:5173/payment-success';
const STUDENT_CANCEL_URL = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/payment-cancel`
    : 'http://localhost:5173/payment-cancel';
const PLATFORM_FEE_PCT = parseFloat(process.env.PLATFORM_FEE_PCT || '0.3');

function hasActiveAccess(enrollment: { isActive: boolean; expiresAt: Date | null }): boolean {
    return enrollment.isActive && (enrollment.expiresAt === null || enrollment.expiresAt.getTime() > Date.now());
}

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
            if (message === 'COURSE_NOT_PUBLISHED') return res.status(400).json({ error: 'Course is not published' });
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
            if (message === 'COURSE_NOT_PUBLISHED') return res.status(400).json({ error: 'Course is not published' });
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
            where: {
                studentId: authReq.user.userId,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
                course: { status: CourseStatus.PUBLISHED },
            },
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

        const promotionCode = req.body?.promotionCode as string | undefined;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: {
                id: true,
                price: true,
                teacherId: true,
                accessDurationDays: true,
                status: true,
            },
        });
        if (!course) return res.status(404).json({ error: 'Course not found' });
        if (course.status !== CourseStatus.PUBLISHED) return res.status(400).json({ error: 'Course is not published' });

        const existing = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId: authReq.user.userId, courseId } },
        });
        if (existing && hasActiveAccess(existing)) {
            return res.status(200).json({ message: 'Already enrolled', enrollment: existing });
        }

        const result = await prisma.$transaction(async (tx) => {
            const enrollmentData = {
                type: course.price > 0 ? EnrollmentType.PAID : EnrollmentType.FREE,
                enrollmentDate: new Date(),
                expiresAt: course.accessDurationDays
                    ? new Date(Date.now() + course.accessDurationDays * 24 * 60 * 60 * 1000)
                    : null,
                isActive: true,
            };

            const createdEnrollment = existing
                ? await tx.enrollment.update({
                    where: { id: existing.id },
                    data: enrollmentData,
                })
                : await tx.enrollment.create({
                    data: {
                        studentId: authReq.user!.userId,
                        courseId,
                        ...enrollmentData,
                    },
                });

            let tempRewardInfo: { referrerId: number; friendName: string; rewardCode: string } | null = null;

            if (course.price > 0) {
                let grossAmount = course.price;

                if (promotionCode) {
                    const promotion = await tx.promotion.findFirst({
                        where: {
                            code: promotionCode.toUpperCase(),
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() },
                        },
                    });
                    if (promotion) {
                        const isUserValid = promotion.userId === null || promotion.userId === authReq.user!.userId;
                        const isCourseValid = promotion.courseId === null || promotion.courseId === courseId;
                        const hasUsesLeft = promotion.usageLimit === null || promotion.usedCount < promotion.usageLimit;
                        
                        if (isUserValid && isCourseValid && hasUsesLeft) {
                            const { discountedPrice } = calculateDiscount(course.price, promotion);
                            grossAmount = discountedPrice;
                            
                            // Increment usage
                            await tx.promotion.update({
                                where: { id: promotion.id },
                                data: { usedCount: { increment: 1 } },
                            });
                        }
                    }
                }

                const split = await calculateRevenueSplit(
                    tx,
                    grossAmount,
                    courseId,
                    authReq.user!.userId,
                    promotionCode
                );

                const payment = await tx.payment.upsert({
                    where: { enrollmentId: createdEnrollment.id },
                    create: {
                        amount: grossAmount,
                        status: 'SUCCESSFUL',
                        stripeSessionId: `dev-confirm-${createdEnrollment.id}-${Date.now()}`,
                        enrollmentId: createdEnrollment.id,
                        studentId: authReq.user!.userId,
                    },
                    update: {
                        amount: grossAmount,
                        status: 'SUCCESSFUL',
                        stripeSessionId: `dev-confirm-${createdEnrollment.id}-${Date.now()}`,
                        studentId: authReq.user!.userId,
                    },
                });

                await tx.revenueLedger.upsert({
                    where: { enrollmentId: createdEnrollment.id },
                    create: {
                        grossAmount,
                        platformFee: split.platformFee,
                        teacherShare: split.teacherShare,
                        stripeFee: split.stripeFee,
                        netRevenue: split.netRevenue,
                        channel: split.channel,
                        payoutStatus: PayoutStatus.HELD,
                        paymentId: payment.id,
                        enrollmentId: createdEnrollment.id,
                        courseId,
                        teacherId: course.teacherId,
                    },
                    update: {
                        grossAmount,
                        platformFee: split.platformFee,
                        teacherShare: split.teacherShare,
                        stripeFee: split.stripeFee,
                        netRevenue: split.netRevenue,
                        channel: split.channel,
                        payoutStatus: PayoutStatus.HELD,
                        paidAt: null,
                        paymentId: payment.id,
                        courseId,
                        teacherId: course.teacherId,
                    },
                });

                // Referral tracking and rewards
                const referral = await tx.referral.findUnique({
                    where: { referredId: authReq.user!.userId },
                });

                if (referral && referral.status === 'PENDING') {
                    await tx.referral.update({
                        where: { id: referral.id },
                        data: { status: 'COMPLETED' },
                    });

                    const rewardCode = `REF-REV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 30); // 30 days expiry

                    await tx.promotion.create({
                        data: {
                            code: rewardCode,
                            description: `Referral reward for sharing with friend`,
                            discountType: 'PERCENTAGE',
                            discountValue: 20,
                            usageLimit: 1,
                            startDate: new Date(),
                            endDate: expiry,
                            isActive: true,
                            userId: referral.referrerId,
                        },
                    });

                    const referredUser = await tx.user.findUnique({
                        where: { id: authReq.user!.userId },
                        select: { username: true, firstName: true, lastName: true },
                    });
                    const friendName = referredUser
                        ? ([referredUser.firstName, referredUser.lastName].filter(Boolean).join(' ') || referredUser.username)
                        : 'Your friend';

                    tempRewardInfo = {
                        referrerId: referral.referrerId,
                        friendName,
                        rewardCode,
                    };
                }
            }

            return { createdEnrollment, tempRewardInfo };
        });

        if (promotionCode) {
            const { incrementPromotionUsage } = require('../services/promotion.service');
            await incrementPromotionUsage(promotionCode);
        }

        if (result.tempRewardInfo) {
            try {
                const { createNotification } = require('../services/notification.service');
                await createNotification({
                    userId: result.tempRewardInfo.referrerId,
                    type: 'REFERRAL_SUCCESS',
                    title: 'Referral Reward Earned! 🎁',
                    message: `Congratulations! Your friend ${result.tempRewardInfo.friendName} completed their first purchase. You earned a 20% discount coupon code: ${result.tempRewardInfo.rewardCode} (valid for 30 days).`,
                    sendEmail: true,
                });
                console.log(`Sent referral reward notification to referrer ${result.tempRewardInfo.referrerId}`);
            } catch (err) {
                console.error('Failed to send referral reward notification:', err);
            }
        }

        return res.status(201).json({ message: 'Enrollment confirmed', enrollment: result.createdEnrollment });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to confirm enrollment', details: (error as Error).message });
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
            if (message === 'COURSE_NOT_PUBLISHED') return res.status(403).json({ error: 'Course is not published' });
            throw error;
        }
    } catch {
        return res.status(500).json({ error: 'Unable to fetch course content' });
    }
}
