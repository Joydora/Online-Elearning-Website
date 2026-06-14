import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { finalizePaidEnrollment, finalizeTrialEnrollment } from '../src/services/enroll.service';

const prisma = new PrismaClient();

async function runOnce(label: string, accessDurationDays: number | null) {
    const course = await prisma.course.findUnique({ where: { id: 1 } });
    if (!course) throw new Error('course 1 missing');
    await prisma.course.update({
        where: { id: course.id },
        data: { accessDurationDays, trialDurationDays: 7 },
    });

    const student = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    if (!student) throw new Error('student2 missing');

    // Clean slate
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id, courseId: course.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id, courseId: course.id } });
    await prisma.user.update({ where: { id: student.id }, data: { stripeCustomerId: null, stripePaymentMethodId: null } });

    // Trial → Paid upgrade path
    await finalizeTrialEnrollment({
        studentId: student.id,
        courseId: course.id,
        paymentMethodId: `pm_${label}`,
        cardFingerprint: `fp_${label}`,
    });

    const trial = await prisma.enrollment.update({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        data: { progress: 40 },
    });

    const payment = await prisma.payment.create({
        data: {
            amount: course.price,
            status: 'PENDING',
            stripeSessionId: `cs_${label}_${Date.now()}`,
            enrollmentId: trial.id,
            studentId: student.id,
        },
    });

    await finalizePaidEnrollment(payment.id);

    const after = await prisma.enrollment.findUnique({ where: { id: trial.id } });

    console.log(`\n--- ${label} (accessDurationDays=${accessDurationDays}) ---`);
    console.log(`  type: ${after?.type}`);
    console.log(`  isActive: ${after?.isActive}`);
    console.log(`  progress: ${after?.progress} (preserved?)`);
    console.log(`  expiresAt: ${after?.expiresAt?.toISOString() ?? 'null (permanent)'}`);

    if (accessDurationDays === null) {
        const ok = after?.type === 'PAID' && after?.expiresAt === null && after?.isActive === true && after?.progress === 40;
        console.log(`  ${ok ? '✅' : '❌'} permanent paid matches expectations`);
    } else {
        const expectedMin = Date.now() + (accessDurationDays - 1) * 86_400_000;
        const expectedMax = Date.now() + (accessDurationDays + 1) * 86_400_000;
        const gotMs = after?.expiresAt?.getTime() ?? 0;
        const withinWindow = gotMs >= expectedMin && gotMs <= expectedMax;
        const ok = after?.type === 'PAID' && after?.isActive === true && withinWindow && after?.progress === 40;
        console.log(`  ${ok ? '✅' : '❌'} time-limited paid matches expectations (${accessDurationDays} days ±1)`);
    }
}

async function main() {
    await runOnce('permanent', null);
    await runOnce('30days', 30);
    await runOnce('7days', 7);

    // Cleanup
    const student = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    if (student) {
        await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
        await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
        await prisma.user.update({ where: { id: student.id }, data: { stripeCustomerId: null, stripePaymentMethodId: null } });
    }
    await prisma.course.update({ where: { id: 1 }, data: { accessDurationDays: null } });

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
