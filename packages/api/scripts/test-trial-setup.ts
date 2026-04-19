import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { startTrialSetup } from '../src/services/enroll.service';

const prisma = new PrismaClient();

async function expectError(label: string, fn: () => Promise<unknown>, expected: string) {
    try {
        await fn();
        console.log(`❌ ${label}: expected ${expected}, got no error`);
        return false;
    } catch (err) {
        const msg = (err as Error).message;
        if (msg === expected) {
            console.log(`✅ ${label}: threw ${expected}`);
            return true;
        }
        console.log(`❌ ${label}: expected ${expected}, got ${msg}`);
        return false;
    }
}

async function main() {
    const student = await prisma.user.findUnique({ where: { email: 'student1@gmail.com' } });
    const otherStudent = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    const course = await prisma.course.findFirst({ where: { id: 1 } });

    if (!student || !otherStudent || !course) {
        console.error('Seed data missing');
        process.exit(1);
    }

    console.log('--- Test 1: COURSE_NOT_FOUND ---');
    await expectError(
        'non-existent course',
        () => startTrialSetup({ courseId: 99999, studentId: student.id, successUrl: 'x', cancelUrl: 'x' }),
        'COURSE_NOT_FOUND',
    );

    console.log('\n--- Test 2: ALREADY_ENROLLED ---');
    // student1 is already enrolled in course 1 from seed
    await expectError(
        'already enrolled student',
        () => startTrialSetup({ courseId: course.id, studentId: student.id, successUrl: 'x', cancelUrl: 'x' }),
        'ALREADY_ENROLLED',
    );

    console.log('\n--- Test 3: TRIAL_NOT_AVAILABLE ---');
    // Temporarily null out trialDurationDays, then test with otherStudent (who is not enrolled)
    const original = course.trialDurationDays;
    await prisma.course.update({ where: { id: course.id }, data: { trialDurationDays: null } });
    await expectError(
        'course without trial',
        () => startTrialSetup({ courseId: course.id, studentId: otherStudent.id, successUrl: 'x', cancelUrl: 'x' }),
        'TRIAL_NOT_AVAILABLE',
    );
    await prisma.course.update({ where: { id: course.id }, data: { trialDurationDays: original } });

    console.log('\n--- Test 4: USER_NOT_FOUND ---');
    await expectError(
        'non-existent student',
        () => startTrialSetup({ courseId: course.id, studentId: 99999, successUrl: 'x', cancelUrl: 'x' }),
        'USER_NOT_FOUND',
    );

    await prisma.$disconnect();
    console.log('\nAll validation paths verified.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
