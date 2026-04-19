import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getStripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is not defined');
    }

    return new Stripe(secretKey, {
        apiVersion: '2024-06-20',
    });
}

export async function checkoutCourse(options: {
    courseId: number;
    studentId: number;
    successUrl: string;
    cancelUrl: string;
}): Promise<string> {
    const course = await prisma.course.findUnique({
        where: { id: options.courseId },
        select: { id: true, title: true, price: true },
    });

    if (!course) {
        throw new Error('COURSE_NOT_FOUND');
    }

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

    const stripe = getStripeClient();

    const user = await prisma.user.findUnique({
        where: { id: options.studentId },
        select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    // Reuse existing TRIAL enrollment (upgrade path) or create a fresh one for a new purchase.
    const enrollment = existingEnrollment
        ? existingEnrollment
        : await prisma.enrollment.create({
              data: {
                  studentId: options.studentId,
                  courseId: options.courseId,
              },
          });

    // Reuse a pending Payment if one already exists (e.g. a previous abandoned checkout);
    // the unique constraint on enrollmentId means we can have at most one Payment row per enrollment.
    const payment =
        existingEnrollment?.payment && existingEnrollment.payment.status !== 'SUCCESSFUL'
            ? existingEnrollment.payment
            : await prisma.payment.create({
                  data: {
                      amount: course.price,
                      status: 'PENDING',
                      stripeSessionId: `pending_${randomUUID()}`,
                      enrollmentId: enrollment.id,
                      studentId: options.studentId,
                  },
              });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        success_url: options.successUrl,
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
                    unit_amount: Math.round(course.price * 100),
                    product_data: {
                        name: course.title,
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

    await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: session.id },
    });

    return session.url ?? '';
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

    if (payment.status === 'SUCCESSFUL') {
        return { enrollmentId: payment.enrollmentId, upgradedFromTrial: false, alreadyProcessed: true };
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: { id: payment.enrollmentId },
        select: { type: true },
    });

    const upgradedFromTrial = enrollment?.type === 'TRIAL';

    await prisma.$transaction([
        prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'SUCCESSFUL',
                ...(stripeSessionId ? { stripeSessionId } : {}),
            },
        }),
        prisma.enrollment.update({
            where: { id: payment.enrollmentId },
            data: { type: 'PAID', expiresAt: null },
        }),
    ]);

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

    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not defined');
    }

    const stripe = getStripeClient();

    if (!signature) {
        throw new Error('STRIPE_SIGNATURE_MISSING');
    }

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type !== 'checkout.session.completed') {
        return;
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === 'setup') {
        await handleTrialSetupCompleted(stripe, session);
        return;
    }

    await handlePaymentCompleted(session);
}
