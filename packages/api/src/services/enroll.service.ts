import Stripe from 'stripe';
import { PrismaClient, EnrollmentType } from '@prisma/client';
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
        select: { id: true, title: true, price: true, trialDurationDays: true, accessDurationDays: true },
    });

    if (!course) throw new Error('COURSE_NOT_FOUND');

    const existingEnrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: options.studentId, courseId: options.courseId } },
    });

    if (existingEnrollment) throw new Error('ALREADY_ENROLLED');

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
        const promotion = await getActivePromotionByCode(options.promotionCode);
        if (promotion) {
            const discount = calculateDiscount(course.price, promotion);
            finalPrice = discount.discountedPrice;
            discountAmount = discount.discountAmount;
            promotionId = promotion.id;
        }
    }

    // ── Free course ───────────────────────────────────────────────────
    if (finalPrice === 0) {
        await prisma.enrollment.create({
            data: {
                studentId: options.studentId,
                courseId: options.courseId,
                type: EnrollmentType.FREE,
                expiresAt: calcExpiresAt(course.accessDurationDays),
                isActive: true,
            },
        });
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

    // EPIC 2: reject expired enrollments
    if (!enrollment.isActive) throw new Error('ENROLLMENT_EXPIRED');

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
            description: true,
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

    // EPIC 1: for TRIAL enrollments, mask non-free-preview content URLs
    if (enrollment.type === EnrollmentType.TRIAL) {
        course.modules = course.modules.map((mod) => ({
            ...mod,
            contents: mod.contents.map((c) => ({
                ...c,
                videoUrl: c.isFreePreview ? c.videoUrl : null,
                documentUrl: c.isFreePreview ? c.documentUrl : null,
            })),
        }));
    }

    return {
        ...course,
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

    if (existing) {
        console.log('User already enrolled, skipping...');
        return;
    }

    const grossAmount = (session.amount_total || 0) / 100;
    const platformFee = parseFloat((grossAmount * PLATFORM_FEE_PCT).toFixed(2));
    const teacherShare = parseFloat((grossAmount - platformFee).toFixed(2));

    // EPIC 2 + EPIC 4: create enrollment + payment + ledger atomically
    await prisma.$transaction(async (tx) => {
        const enrollment = await tx.enrollment.create({
            data: {
                studentId: studentIdNum,
                courseId: courseIdNum,
                type: EnrollmentType.PAID,
                expiresAt: calcExpiresAt(course.accessDurationDays),
                isActive: true,
            },
        });

        const payment = await tx.payment.create({
            data: {
                amount: grossAmount,
                status: 'SUCCESSFUL',
                stripeSessionId: session.id,
                enrollmentId: enrollment.id,
                studentId: studentIdNum,
            },
        });

        // EPIC 4: Revenue Ledger entry
        await tx.revenueLedger.create({
            data: {
                grossAmount,
                platformFee,
                teacherShare,
                payoutStatus: 'HELD',
                paymentId: payment.id,
                enrollmentId: enrollment.id,
                courseId: courseIdNum,
                teacherId: course.teacherId,
            },
        });
    });

    if (promotionCode) await incrementPromotionUsage(promotionCode);

    console.log(`Enrollment + ledger created for student ${studentIdNum} in course ${courseIdNum}`);
}
