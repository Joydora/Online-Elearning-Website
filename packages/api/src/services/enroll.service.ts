import Stripe from 'stripe';
import { PrismaClient, EnrollmentType, ReferralChannel } from '@prisma/client';
import crypto from 'crypto';
import { getActivePromotionByCode, calculateDiscount, incrementPromotionUsage } from './promotion.service';

const prisma = new PrismaClient();

const PLATFORM_FEE_PCT = parseFloat(process.env.PLATFORM_FEE_PCT || '0.3'); // 30% default

function getStripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is not defined');
    return new Stripe(secretKey, { apiVersion: '2024-06-20' });
}

function calcExpiresAt(accessDurationDays: number | null): Date | null {
    if (!accessDurationDays) return null;
    const d = new Date();
    d.setDate(d.getDate() + accessDurationDays);
    return d;
}

function hasActiveAccess(enrollment: { isActive: boolean; expiresAt: Date | null }): boolean {
    return enrollment.isActive && (enrollment.expiresAt === null || enrollment.expiresAt.getTime() > Date.now());
}

export type RevenueSplitResult = {
    stripeFee: number;
    netRevenue: number;
    channel: ReferralChannel;
    platformFee: number;
    teacherShare: number;
};

export async function calculateRevenueSplit(
    tx: any,
    grossAmount: number,
    courseId: number,
    studentId: number,
    promotionCode?: string | null
): Promise<RevenueSplitResult> {
    let channel: ReferralChannel = ReferralChannel.ORGANIC;

    if (promotionCode) {
        const promotion = await tx.promotion.findFirst({
            where: { code: promotionCode.toUpperCase() },
        });
        if (promotion) {
            if (promotion.userId !== null || promotion.code.startsWith('WEL-') || promotion.code.startsWith('REF-REV-')) {
                channel = ReferralChannel.STUDENT_REFERRAL;
            } else if (promotion.creatorId !== null) {
                const creator = await tx.user.findUnique({
                    where: { id: promotion.creatorId },
                    select: { id: true, role: true },
                });
                const course = await tx.course.findUnique({
                    where: { id: courseId },
                    select: { teacherId: true },
                });
                if (creator?.role === 'TEACHER' || promotion.creatorId === course?.teacherId) {
                    channel = ReferralChannel.TEACHER_PROMO;
                }
            }
        }
    }

    let stripeFee = 0;
    if (grossAmount > 0) {
        stripeFee = Number((grossAmount * 0.029 + 0.30).toFixed(2));
    }
    const netRevenue = Number(Math.max(0, grossAmount - stripeFee).toFixed(2));

    let platformFee = 0;
    let teacherShare = 0;

    if (channel === ReferralChannel.TEACHER_PROMO) {
        teacherShare = Number((netRevenue * 0.95).toFixed(2));
        platformFee = Number((netRevenue - teacherShare).toFixed(2));
    } else if (channel === ReferralChannel.STUDENT_REFERRAL) {
        teacherShare = Number((netRevenue * 0.60).toFixed(2));
        platformFee = Number((netRevenue - teacherShare).toFixed(2));
    } else { // ORGANIC
        teacherShare = Number((netRevenue * 0.50).toFixed(2));
        platformFee = Number((netRevenue - teacherShare).toFixed(2));
    }

    return {
        stripeFee,
        netRevenue,
        channel,
        platformFee,
        teacherShare,
    };
}

export async function checkoutCourse(options: {
    courseId: number;
    studentId: number;
    successUrl: string;
    cancelUrl: string;
    promotionCode?: string;
    trial?: boolean;
}): Promise<string> {
    const course = await prisma.course.findUnique({
        where: { id: options.courseId },
        select: { id: true, title: true, price: true, trialDurationDays: true, accessDurationDays: true, status: true },
    });

    if (!course) throw new Error('COURSE_NOT_FOUND');

    // EPIC 2: only allow enrollment for PUBLISHED courses
    if (course.status !== 'PUBLISHED') throw new Error('COURSE_NOT_PUBLISHED');

    const existingEnrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: options.studentId, courseId: options.courseId } },
    });

    if (options.trial && existingEnrollment) throw new Error('ALREADY_ENROLLED');
    if (
        !options.trial &&
        existingEnrollment &&
        existingEnrollment.type !== EnrollmentType.TRIAL &&
        hasActiveAccess(existingEnrollment)
    ) {
        throw new Error('ALREADY_ENROLLED');
    }

    // ── EPIC 1: Trial enrollment ──────────────────────────────────────
    if (options.trial) {
        if (!course.trialDurationDays) throw new Error('TRIAL_NOT_AVAILABLE');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + course.trialDurationDays);

        await prisma.enrollment.create({
            data: {
                studentId: options.studentId,
                courseId: options.courseId,
                type: EnrollmentType.TRIAL,
                expiresAt,
                isActive: true,
            },
        });
        return `${options.successUrl}?trial=true`;
    }

    // ── Apply promotion ───────────────────────────────────────────────
    let finalPrice = course.price;
    let discountAmount = 0;
    let promotionId: number | undefined;

    if (options.promotionCode && course.price > 0) {
        const promotion = await getActivePromotionByCode(options.promotionCode, options.courseId);
        if (promotion) {
            if (promotion.userId !== null && promotion.userId !== options.studentId) {
                throw new Error('PROMOTION_NOT_AUTHORIZED');
            }
            const discount = calculateDiscount(course.price, promotion);
            finalPrice = discount.discountedPrice;
            discountAmount = discount.discountAmount;
            promotionId = promotion.id;
        }
    }

    // ── Free course ───────────────────────────────────────────────────
    if (finalPrice === 0) {
        if (existingEnrollment) {
            await prisma.enrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                    type: EnrollmentType.FREE,
                    enrollmentDate: new Date(),
                    expiresAt: calcExpiresAt(course.accessDurationDays),
                    isActive: true,
                },
            });
        } else {
            await prisma.enrollment.create({
                data: {
                    studentId: options.studentId,
                    courseId: options.courseId,
                    type: EnrollmentType.FREE,
                    expiresAt: calcExpiresAt(course.accessDurationDays),
                    isActive: true,
                },
            });
        }
        if (options.promotionCode) await incrementPromotionUsage(options.promotionCode);
        return `${options.successUrl}?free=true`;
    }

    // ── Stripe checkout ───────────────────────────────────────────────
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${options.successUrl}?courseId=${options.courseId}${options.promotionCode ? `&promo=${options.promotionCode}` : ''}`,
        cancel_url: options.cancelUrl,
        metadata: {
            courseId: options.courseId.toString(),
            studentId: options.studentId.toString(),
            courseTitle: course.title,
            promotionCode: options.promotionCode || '',
            promotionId: promotionId?.toString() || '',
        },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: Math.round(finalPrice * 100),
                    product_data: {
                        name: course.title,
                        description: discountAmount > 0
                            ? `Original: $${course.price.toFixed(2)}, Discount: $${discountAmount.toFixed(2)}`
                            : undefined,
                    },
                },
            },
        ],
    });

    return session.url ?? '';
}

export async function getCourseForEnrolledStudent(courseId: number, studentId: number) {
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
    });

    if (!enrollment) throw new Error('NOT_ENROLLED');

    const expiresAtMs = enrollment.expiresAt?.getTime();
    const isExpired = expiresAtMs !== undefined && expiresAtMs <= Date.now();

    if (!enrollment.isActive || isExpired) {
        if (enrollment.isActive && isExpired) {
            await prisma.enrollment.update({
                where: { id: enrollment.id },
                data: { isActive: false },
            });
        }
        throw new Error('ENROLLMENT_EXPIRED');
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            modules: {
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    title: true,
                    order: true,
                    contents: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            title: true,
                            order: true,
                            contentType: true,
                            videoUrl: true,
                            documentUrl: true,
                            durationInSeconds: true,
                            timeLimitInMinutes: true,
                            isFreePreview: true,
                        },
                    },
                },
            },
        },
    });

    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (course.status !== 'PUBLISHED') throw new Error('COURSE_NOT_PUBLISHED');

    const hasFullAccess = enrollment.type !== EnrollmentType.TRIAL;
    const modules = course.modules.map((module) => ({
        ...module,
        contents: module.contents.map((content) => {
            const canAccessContent = hasFullAccess || content.isFreePreview;

            return {
                ...content,
                videoUrl: canAccessContent ? content.videoUrl : null,
                documentUrl: canAccessContent ? content.documentUrl : null,
                isLocked: !canAccessContent,
            };
        }),
    }));

    return {
        ...course,
        modules,
        enrollment: {
            enrollmentId: enrollment.id,
            progress: enrollment.progress,
            completionDate: enrollment.completionDate,
            type: enrollment.type,
            expiresAt: enrollment.expiresAt,
            isActive: enrollment.isActive,
        },
    };
}

export async function handleStripeWebhook(payload: Buffer, signature: string | undefined): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not defined');

    const stripe = getStripeClient();
    if (!signature) throw new Error('STRIPE_SIGNATURE_MISSING');

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    if (event.type !== 'checkout.session.completed') return;

    const session = event.data.object as Stripe.Checkout.Session;
    const courseId = session.metadata?.courseId;
    const studentId = session.metadata?.studentId;
    const promotionCode = session.metadata?.promotionCode;

    if (!courseId || !studentId) throw new Error('STRIPE_METADATA_MISSING');

    const courseIdNum = Number(courseId);
    const studentIdNum = Number(studentId);

    const course = await prisma.course.findUnique({
        where: { id: courseIdNum },
        select: { accessDurationDays: true, teacherId: true },
    });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    const existing = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: studentIdNum, courseId: courseIdNum } },
    });

    if (existing && existing.type !== EnrollmentType.TRIAL && hasActiveAccess(existing)) {
        console.log('User already enrolled, skipping...');
        return;
    }

    const grossAmount = (session.amount_total || 0) / 100;

    // EPIC 2 + EPIC 4: create enrollment + payment + ledger atomically
    const referralRewardInfo = await prisma.$transaction(async (tx) => {
        const split = await calculateRevenueSplit(
            tx,
            grossAmount,
            courseIdNum,
            studentIdNum,
            promotionCode
        );
        const enrollment = existing
            ? await tx.enrollment.update({
                where: { id: existing.id },
                data: {
                    type: EnrollmentType.PAID,
                    enrollmentDate: new Date(),
                    expiresAt: calcExpiresAt(course.accessDurationDays),
                    isActive: true,
                },
            })
            : await tx.enrollment.create({
                data: {
                    studentId: studentIdNum,
                    courseId: courseIdNum,
                    type: EnrollmentType.PAID,
                    expiresAt: calcExpiresAt(course.accessDurationDays),
                    isActive: true,
                },
            });

        const payment = await tx.payment.upsert({
            where: { enrollmentId: enrollment.id },
            create: {
                amount: grossAmount,
                status: 'SUCCESSFUL',
                stripeSessionId: session.id,
                enrollmentId: enrollment.id,
                studentId: studentIdNum,
            },
            update: {
                amount: grossAmount,
                status: 'SUCCESSFUL',
                stripeSessionId: session.id,
                studentId: studentIdNum,
            },
        });

        // EPIC 4: Revenue Ledger entry
        await tx.revenueLedger.upsert({
            where: { enrollmentId: enrollment.id },
            create: {
                grossAmount,
                platformFee: split.platformFee,
                teacherShare: split.teacherShare,
                stripeFee: split.stripeFee,
                netRevenue: split.netRevenue,
                channel: split.channel,
                payoutStatus: 'HELD',
                paymentId: payment.id,
                enrollmentId: enrollment.id,
                courseId: courseIdNum,
                teacherId: course.teacherId,
            },
            update: {
                grossAmount,
                platformFee: split.platformFee,
                teacherShare: split.teacherShare,
                stripeFee: split.stripeFee,
                netRevenue: split.netRevenue,
                channel: split.channel,
                payoutStatus: 'HELD',
                paidAt: null,
                paymentId: payment.id,
                courseId: courseIdNum,
                teacherId: course.teacherId,
            },
        });

        // Referral tracking and rewards
        const referral = await tx.referral.findUnique({
            where: { referredId: studentIdNum },
        });

        let tempRewardInfo: { referrerId: number; friendName: string; rewardCode: string } | null = null;

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
                where: { id: studentIdNum },
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

        return tempRewardInfo;
    });

    if (promotionCode) await incrementPromotionUsage(promotionCode);

    if (referralRewardInfo) {
        try {
            const { createNotification } = require('./notification.service');
            await createNotification({
                userId: referralRewardInfo.referrerId,
                type: 'REFERRAL_SUCCESS',
                title: 'Referral Reward Earned! 🎁',
                message: `Congratulations! Your friend ${referralRewardInfo.friendName} completed their first purchase. You earned a 20% discount coupon code: ${referralRewardInfo.rewardCode} (valid for 30 days).`,
                sendEmail: true,
            });
            console.log(`Sent referral reward notification to referrer ${referralRewardInfo.referrerId}`);
        } catch (err) {
            console.error('Failed to send referral reward notification:', err);
        }
    }

    console.log(`Enrollment + ledger created for student ${studentIdNum} in course ${courseIdNum}`);
}
