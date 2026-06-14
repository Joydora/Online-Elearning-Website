import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { PaymentStatus, Prisma } from '@prisma/client';
import { recordRevenue } from './revenue.service';
import { prisma } from '../lib/prisma';

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
        where: {
            studentId_courseId: {
                studentId: options.studentId,
                courseId: options.courseId,
            },
        },
        include: { payment: true },
    });

    if (existingEnrollment && existingEnrollment.type === 'PAID') {
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

    const user = await prisma.user.findUnique({
        where: { id: options.studentId },
        select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    // Enrollment + Payment must land together or not at all. Without a
    // transaction, if the Payment insert fails (DB hiccup, unique
    // violation), the new Enrollment row is orphaned and the student
    // can't retry — the @@unique(studentId, courseId) now blocks them.
    const { enrollment, payment } = await prisma.$transaction(async (tx) => {
        const enrol = existingEnrollment
            ? existingEnrollment
            : await tx.enrollment.create({
                  data: {
                      studentId: options.studentId,
                      courseId: options.courseId,
                  },
              });

        const pay =
            existingEnrollment?.payment && existingEnrollment.payment.status !== PaymentStatus.SUCCESSFUL
                ? existingEnrollment.payment
                : await tx.payment.create({
                      data: {
                          amount: course.price,
                          status: PaymentStatus.PENDING,
                          stripeSessionId: `pending_${randomUUID()}`,
                          enrollmentId: enrol.id,
                          studentId: options.studentId,
                      },
                  });

        return { enrollment: enrol, payment: pay };
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        success_url: `${options.successUrl}?courseId=${options.courseId}${options.promotionCode ? `&promo=${options.promotionCode}` : ''}`,
        cancel_url: options.cancelUrl,
        metadata: {
            paymentId: payment.id.toString(),
            ...(existingEnrollment?.type === 'TRIAL' ? { upgrade: 'trial_to_paid' } : {}),
        },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: course.price.mul(100).round().toNumber(),
                    product_data: {
                        name: course.title,
                        description: discountAmount > 0
                            ? `Original: $${course.price.toFixed(2)}, Discount: $${discountAmount.toFixed(2)}`
                            : undefined,
                    },
                },
            },
        ],
    };

    if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
    } else if (user.email) {
        sessionParams.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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

/**
 * Course content for staff (the owning teacher or any admin) — full access, no
 * enrollment required, and unpublished courses are allowed so teachers can
 * preview their own work in the learning player.
 */
export async function getCourseContentForStaff(courseId: number, userId: number, role: Role) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            id: true,
            title: true,
            description: true,
            teacherId: true,
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
    if (role !== Role.ADMIN && course.teacherId !== userId) throw new Error('NOT_COURSE_OWNER');

    const modules = course.modules.map((module) => ({
        ...module,
        contents: module.contents.map((content) => ({ ...content, isLocked: false })),
    }));

    return {
        id: course.id,
        title: course.title,
        description: course.description,
        modules,
        // Synthetic enrollment so the player treats staff as having full access.
        enrollment: {
            enrollmentId: 0,
            progress: 0,
            completionDate: null,
            type: EnrollmentType.PAID,
            expiresAt: null,
            isActive: true,
        },
    };
}

export async function finalizePaidEnrollment(
    paymentId: number,
    stripeSessionId?: string,
): Promise<{ enrollmentId: number; upgradedFromTrial: boolean; alreadyProcessed: boolean }> {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, enrollmentId: true, status: true },
    });

    if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
        return { enrollmentId: payment.enrollmentId, upgradedFromTrial: false, alreadyProcessed: true };
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: { id: payment.enrollmentId },
        select: {
            type: true,
            course: { select: { accessDurationDays: true } },
        },
    });

    const upgradedFromTrial = enrollment?.type === 'TRIAL';
    const accessDays = enrollment?.course?.accessDurationDays ?? null;

    let expiresAt: Date | null = null;
    if (accessDays !== null && accessDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + accessDays);
    }

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.SUCCESSFUL,
                ...(stripeSessionId ? { stripeSessionId } : {}),
            },
        }),
        prisma.enrollment.update({
            where: { id: payment.enrollmentId },
            data: { type: 'PAID', expiresAt, isActive: true },
        }),
    ]);

    // Book a RevenueLedger entry for this payment. Best-effort: if it throws
    // we log and move on — the enrollment flip has already succeeded and the
    // ledger can be reconciled later via an admin sweep.
    try {
        const ledgerResult = await recordRevenue(payment.id);
        if ('created' in ledgerResult && ledgerResult.created) {
            console.log(
                `💰 RevenueLedger #${ledgerResult.ledgerId} booked: gross=${ledgerResult.grossAmount}, fee=${ledgerResult.platformFee}, teacher=${ledgerResult.teacherShare}`,
            );
        }
    } catch (err) {
        console.error(
            `⚠️  recordRevenue failed for payment ${payment.id}:`,
            (err as Error).message,
        );
    }

    return { enrollmentId: payment.enrollmentId, upgradedFromTrial, alreadyProcessed: false };
}

export async function startTrialSetup(options: {
    courseId: number;
    studentId: number;
    successUrl: string;
    cancelUrl: string;
}): Promise<string> {
    const course = await prisma.course.findUnique({
        where: { id: options.courseId },
        select: { id: true, title: true, trialDurationDays: true },
    });

    if (!course) {
        throw new Error('COURSE_NOT_FOUND');
    }

    if (!course.trialDurationDays || course.trialDurationDays <= 0) {
        throw new Error('TRIAL_NOT_AVAILABLE');
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: {
                studentId: options.studentId,
                courseId: options.courseId,
            },
        },
    });

    if (existingEnrollment) {
        throw new Error('ALREADY_ENROLLED');
    }

    const user = await prisma.user.findUnique({
        where: { id: options.studentId },
        select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    const stripe = getStripeClient();

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: user.id.toString() },
        });
        stripeCustomerId = customer.id;
        await prisma.user.update({
            where: { id: user.id },
            data: { stripeCustomerId },
        });
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: stripeCustomerId,
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        payment_method_types: ['card'],
        metadata: {
            studentId: options.studentId.toString(),
            courseId: options.courseId.toString(),
            purpose: 'trial',
        },
    });

    return session.url ?? '';
}

export async function finalizeTrialEnrollment(params: {
    studentId: number;
    courseId: number;
    paymentMethodId: string;
    cardFingerprint: string;
}): Promise<{ enrollmentId: number } | { skipped: 'ALREADY_ENROLLED' }> {
    const existing = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: { studentId: params.studentId, courseId: params.courseId },
        },
    });

    if (existing) {
        return { skipped: 'ALREADY_ENROLLED' };
    }

    const course = await prisma.course.findUnique({
        where: { id: params.courseId },
        select: { trialDurationDays: true },
    });

    if (!course?.trialDurationDays) {
        throw new Error('COURSE_TRIAL_CONFIG_MISSING');
    }

    const priorTrial = await prisma.enrollment.findFirst({
        where: {
            trialCardFingerprint: params.cardFingerprint,
            courseId: params.courseId,
        },
    });

    if (priorTrial) {
        throw new Error('TRIAL_CARD_ALREADY_USED');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + course.trialDurationDays);

    const [, enrollment] = await prisma.$transaction([
        prisma.user.update({
            where: { id: params.studentId },
            data: { stripePaymentMethodId: params.paymentMethodId },
        }),
        prisma.enrollment.create({
            data: {
                studentId: params.studentId,
                courseId: params.courseId,
                type: 'TRIAL',
                expiresAt,
                trialCardFingerprint: params.cardFingerprint,
            },
        }),
    ]);

    return { enrollmentId: enrollment.id };
}

async function handleTrialSetupCompleted(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
    if (session.metadata?.purpose !== 'trial') {
        return;
    }

    const studentIdStr = session.metadata?.studentId;
    const courseIdStr = session.metadata?.courseId;

    if (!studentIdStr || !courseIdStr) {
        throw new Error('STRIPE_METADATA_MISSING_TRIAL_FIELDS');
    }

    const studentId = Number(studentIdStr);
    const courseId = Number(courseIdStr);

    const setupIntentId =
        typeof session.setup_intent === 'string'
            ? session.setup_intent
            : session.setup_intent?.id;

    if (!setupIntentId) {
        throw new Error('SETUP_INTENT_MISSING');
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
        throw new Error('PAYMENT_METHOD_MISSING');
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const fingerprint = paymentMethod.card?.fingerprint;

    if (!fingerprint) {
        throw new Error('CARD_FINGERPRINT_MISSING');
    }

    await finalizeTrialEnrollment({
        studentId,
        courseId,
        paymentMethodId,
        cardFingerprint: fingerprint,
    });
}

async function handlePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
        throw new Error('STRIPE_METADATA_MISSING_PAYMENT_ID');
    }

    await finalizePaidEnrollment(Number(paymentId), session.id);
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

    // Idempotency gate: if we've already processed this event.id, the
    // unique-constraint insert will throw P2002 and we bail out before
    // running any side effects. Stripe delivers at-least-once, so
    // without this a dropped ACK would re-enroll a student / re-book
    // a RevenueLedger row on every retry.
    try {
        await prisma.stripeWebhookEvent.create({
            data: { id: event.id, type: event.type },
        });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
        ) {
            console.log(`[stripe-webhook] duplicate event ${event.id} ignored`);
            return;
        }
        throw err;
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === 'setup') {
        await handleTrialSetupCompleted(stripe, session);
        return;
    }

    await handlePaymentCompleted(session);
}
