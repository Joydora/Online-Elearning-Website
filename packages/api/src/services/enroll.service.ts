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
    });

    if (existingEnrollment) {
        throw new Error('ALREADY_ENROLLED');
    }

    const stripe = getStripeClient();

    const enrollment = await prisma.enrollment.create({
        data: {
            studentId: options.studentId,
            courseId: options.courseId,
        },
    });

    const payment = await prisma.payment.create({
        data: {
            amount: course.price,
            status: 'PENDING',
            stripeSessionId: `pending_${randomUUID()}`,
            enrollmentId: enrollment.id,
            studentId: options.studentId,
        },
    });

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        customer_email: undefined,
        metadata: {
            paymentId: payment.id.toString(),
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
    });

    await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: session.id },
    });

    return session.url ?? '';
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
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
        throw new Error('STRIPE_METADATA_MISSING_PAYMENT_ID');
    }

    const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });

    if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
    }

    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: 'SUCCESSFUL',
            stripeSessionId: session.id ?? payment.stripeSessionId,
        },
    });
}
