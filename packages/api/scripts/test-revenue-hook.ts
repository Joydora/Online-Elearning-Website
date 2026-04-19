import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { finalizePaidEnrollment, finalizeTrialEnrollment } from '../src/services/enroll.service';

const prisma = new PrismaClient();

async function main() {
    const student = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    const course = await prisma.course.findUnique({ where: { id: 1 } });
    if (!student || !teacher || !course) throw new Error('seed missing');

    // Make sure course has a price we can verify against
    const pricedCourse = await prisma.course.update({
        where: { id: course.id },
        data: { price: 80, trialDurationDays: 7 },
    });

    // Clean slate
    await prisma.revenueLedger.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
    await prisma.user.update({
        where: { id: student.id },
        data: { stripeCustomerId: null, stripePaymentMethodId: null },
    });

    console.log('--- Step 1: student2 trials course 1 ---');
    const trial = await finalizeTrialEnrollment({
        studentId: student.id,
        courseId: pricedCourse.id,
        paymentMethodId: 'pm_hook_test',
        cardFingerprint: 'fp_hook_test',
    });
    console.log(`   trial enrolled:`, trial);

    console.log('\n--- Step 2: create pending Payment for the upgrade ---');
    const enrollmentId = 'enrollmentId' in trial ? trial.enrollmentId : 0;
    const payment = await prisma.payment.create({
        data: {
            amount: pricedCourse.price,
            status: 'PENDING',
            stripeSessionId: `cs_hook_${Date.now()}`,
            enrollmentId,
            studentId: student.id,
        },
    });
    console.log(`   Payment id=${payment.id}, amount=${payment.amount}`);

    console.log('\n--- Step 3: finalizePaidEnrollment (this should book the ledger) ---');
    const result = await finalizePaidEnrollment(payment.id);
    console.log(`   result:`, result);

    console.log('\n--- Step 4: verify RevenueLedger was written ---');
    const ledger = await prisma.revenueLedger.findUnique({ where: { paymentId: payment.id } });
    if (!ledger) {
        console.log('   ❌ no ledger row found');
        process.exit(1);
    }
    console.log(`   ledger:`, {
        id: ledger.id,
        courseId: ledger.courseId,
        teacherId: ledger.teacherId,
        gross: ledger.grossAmount,
        fee: ledger.platformFee,
        share: ledger.teacherShare,
        status: ledger.payoutStatus,
    });
    const ok =
        ledger.grossAmount === 80 &&
        ledger.platformFee === 16 &&
        ledger.teacherShare === 64 &&
        ledger.payoutStatus === 'HELD' &&
        ledger.courseId === pricedCourse.id &&
        ledger.teacherId === teacher.id;
    console.log(`   ${ok ? '✅' : '❌'} ledger contents match (gross 80 = fee 16 + share 64, HELD, correct course/teacher)`);

    console.log('\n--- Step 5: idempotency — re-run finalizePaidEnrollment ---');
    const replay = await finalizePaidEnrollment(payment.id);
    console.log(`   replay:`, replay);
    const count = await prisma.revenueLedger.count({ where: { paymentId: payment.id } });
    console.log(`   ledger rows for this payment: ${count}`);
    console.log(`   ${count === 1 ? '✅' : '❌'} still exactly one ledger row after replay`);

    // Cleanup
    await prisma.revenueLedger.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
    await prisma.user.update({ where: { id: student.id }, data: { stripeCustomerId: null, stripePaymentMethodId: null } });

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
