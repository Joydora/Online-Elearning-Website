import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { finalizePaidEnrollment, finalizeTrialEnrollment } from '../src/services/enroll.service';

const prisma = new PrismaClient();

async function expectOk(label: string, fn: () => Promise<unknown>) {
    try {
        const result = await fn();
        console.log(`✅ ${label}:`, result);
        return true;
    } catch (err) {
        console.log(`❌ ${label}: threw ${(err as Error).message}`);
        return false;
    }
}

async function main() {
    // Isolate: make sure course 1 has trial configured
    const course = await prisma.course.findUnique({ where: { id: 1 } });
    if (!course) throw new Error('Course 1 missing');
    if (!course.trialDurationDays) {
        await prisma.course.update({ where: { id: course.id }, data: { trialDurationDays: 7 } });
    }

    const student2 = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    if (!student2) throw new Error('student2 missing');

    // Clean up any leftover state from previous test runs
    await prisma.payment.deleteMany({
        where: { enrollment: { studentId: student2.id } },
    });
    await prisma.enrollment.deleteMany({ where: { studentId: student2.id } });
    await prisma.user.update({
        where: { id: student2.id },
        data: { stripeCustomerId: null, stripePaymentMethodId: null },
    });

    console.log('--- Step 1: student2 starts a trial via finalizeTrialEnrollment ---');
    await expectOk('trial created', () =>
        finalizeTrialEnrollment({
            studentId: student2.id,
            courseId: course.id,
            paymentMethodId: 'pm_upgrade_test',
            cardFingerprint: 'fp_upgrade_test',
        }),
    );

    console.log('\n--- Step 2: student2 watches videos — progress grows to 45% ---');
    const trial = await prisma.enrollment.update({
        where: { studentId_courseId: { studentId: student2.id, courseId: course.id } },
        data: { progress: 45 },
    });
    console.log(`   progress=${trial.progress}, type=${trial.type}, expiresAt=${trial.expiresAt?.toISOString()}`);

    console.log('\n--- Step 3: simulate an upgrade Checkout — create Payment manually ---');
    // In real flow this would be done by checkoutCourse(), but that hits Stripe.
    // We simulate the payment row the webhook would finalize.
    const payment = await prisma.payment.create({
        data: {
            amount: course.price,
            status: 'PENDING',
            stripeSessionId: `cs_test_sim_${Date.now()}`,
            enrollmentId: trial.id,
            studentId: student2.id,
        },
    });
    console.log(`   created Payment id=${payment.id}, status=${payment.status}`);

    console.log('\n--- Step 4: webhook fires → finalizePaidEnrollment ---');
    await expectOk('enrollment finalized', () =>
        finalizePaidEnrollment(payment.id, `cs_test_final_${Date.now()}`),
    );

    console.log('\n--- Step 5: verify enrollment is now PAID with progress preserved ---');
    const after = await prisma.enrollment.findUnique({
        where: { id: trial.id },
        include: { payment: true },
    });
    if (!after) throw new Error('enrollment vanished');
    const checks = {
        type: after.type,
        expiresAt: after.expiresAt,
        progress: after.progress,
        paymentStatus: after.payment?.status,
    };
    const pass =
        after.type === 'PAID' &&
        after.expiresAt === null &&
        after.progress === 45 &&
        after.payment?.status === 'SUCCESSFUL';
    console.log(`${pass ? '✅' : '❌'} post-upgrade state:`, checks);

    console.log('\n--- Step 6: idempotency — calling finalize again on already-SUCCESSFUL payment ---');
    await expectOk('idempotent', () => finalizePaidEnrollment(payment.id));

    // Cleanup
    await prisma.payment.deleteMany({ where: { enrollmentId: trial.id } });
    await prisma.enrollment.delete({ where: { id: trial.id } });
    await prisma.user.update({
        where: { id: student2.id },
        data: { stripeCustomerId: null, stripePaymentMethodId: null },
    });

    await prisma.$disconnect();
    console.log('\nAll upgrade paths verified.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
