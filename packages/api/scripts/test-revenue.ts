import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { recordRevenue } from '../src/services/revenue.service';

const prisma = new PrismaClient();

async function expectError(label: string, fn: () => Promise<unknown>, expected: string) {
    try {
        await fn();
        console.log(`❌ ${label}: expected ${expected}, got no error`);
    } catch (err) {
        const msg = (err as Error).message;
        if (msg === expected) {
            console.log(`✅ ${label}: threw ${expected}`);
        } else {
            console.log(`❌ ${label}: expected ${expected}, got ${msg}`);
        }
    }
}

async function main() {
    const student = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    const course = await prisma.course.findUnique({ where: { id: 1 } });
    if (!student || !teacher || !course) throw new Error('seed missing');

    // Clean slate
    await prisma.revenueLedger.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });

    // Seed: enrollment + SUCCESSFUL payment
    const enrollment = await prisma.enrollment.create({
        data: { studentId: student.id, courseId: course.id, type: 'PAID' },
    });
    const paidPayment = await prisma.payment.create({
        data: {
            amount: 50,
            status: 'SUCCESSFUL',
            stripeSessionId: `cs_test_rev_${Date.now()}`,
            enrollmentId: enrollment.id,
            studentId: student.id,
        },
    });

    console.log('--- Test 1: first call creates ledger with default fee (20%) ---');
    const r1 = await recordRevenue(paidPayment.id);
    console.log(`   result:`, r1);
    if (r1.created === true) {
        const pass = r1.grossAmount === 50 && r1.platformFee === 10 && r1.teacherShare === 40;
        console.log(`   ${pass ? '✅' : '❌'} math — gross 50 = fee 10 + share 40`);
    }

    console.log('\n--- Test 2: second call for same payment is skipped ---');
    const r2 = await recordRevenue(paidPayment.id);
    console.log(`   result:`, r2);
    console.log(`   ${r2.created === false ? '✅' : '❌'} idempotent`);

    console.log('\n--- Test 3: PENDING payment → PAYMENT_NOT_PAID ---');
    const pendingEnrollment = await prisma.enrollment.create({
        data: { studentId: (await prisma.user.findUnique({ where: { email: 'student1@gmail.com' } }))!.id, courseId: course.id, type: 'PAID' },
    }).catch(async () => {
        // student1 already enrolled in course 1 from seed — reuse it
        return prisma.enrollment.findUniqueOrThrow({ where: { studentId_courseId: { studentId: 3, courseId: 1 } } });
    });
    // Make sure there's no existing payment on that enrollment before creating a pending one
    await prisma.payment.deleteMany({ where: { enrollmentId: pendingEnrollment.id } });
    const pendingPayment = await prisma.payment.create({
        data: {
            amount: 30,
            status: 'PENDING',
            stripeSessionId: `cs_test_pending_${Date.now()}`,
            enrollmentId: pendingEnrollment.id,
            studentId: pendingEnrollment.studentId,
        },
    });
    await expectError('pending payment', () => recordRevenue(pendingPayment.id), 'PAYMENT_NOT_PAID');

    console.log('\n--- Test 4: unknown paymentId → PAYMENT_NOT_FOUND ---');
    await expectError('missing payment', () => recordRevenue(999_999), 'PAYMENT_NOT_FOUND');

    console.log('\n--- Test 5: env override PLATFORM_FEE_PCT=35 ---');
    process.env.PLATFORM_FEE_PCT = '35';
    await prisma.payment.deleteMany({ where: { enrollmentId: pendingPayment.enrollmentId } });
    const p2 = await prisma.payment.create({
        data: {
            amount: 100,
            status: 'SUCCESSFUL',
            stripeSessionId: `cs_test_env_${Date.now()}`,
            enrollmentId: pendingPayment.enrollmentId,
            studentId: pendingPayment.studentId,
        },
    });
    const r5 = await recordRevenue(p2.id);
    console.log(`   result:`, r5);
    if (r5.created === true) {
        const pass = r5.grossAmount === 100 && r5.platformFee === 35 && r5.teacherShare === 65;
        console.log(`   ${pass ? '✅' : '❌'} env fee applied — gross 100 = fee 35 + share 65`);
    }

    // Cleanup
    await prisma.revenueLedger.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
