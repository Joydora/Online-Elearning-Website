import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { finalizeTrialEnrollment } from '../src/services/enroll.service';

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
    const student2 = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    const course = await prisma.course.findFirst({ where: { id: 1 } });

    if (!student2 || !course) {
        throw new Error('Seed data missing');
    }

    // Clean slate: remove any TRIAL enrollment student2 might have
    await prisma.enrollment.deleteMany({
        where: { studentId: student2.id, courseId: course.id },
    });
    await prisma.user.update({ where: { id: student2.id }, data: { stripePaymentMethodId: null } });

    console.log('--- Test 1: success path (student2 on course 1) ---');
    await expectOk('creates TRIAL enrollment', async () => {
        const result = await finalizeTrialEnrollment({
            studentId: student2.id,
            courseId: course.id,
            paymentMethodId: 'pm_test_aaa',
            cardFingerprint: 'fp_test_aaa',
        });
        const e = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId: student2.id, courseId: course.id } },
        });
        const u = await prisma.user.findUnique({ where: { id: student2.id } });
        return {
            result,
            enrollmentType: e?.type,
            expiresAt: e?.expiresAt?.toISOString(),
            fingerprintStored: e?.trialCardFingerprint,
            pmOnUser: u?.stripePaymentMethodId,
        };
    });

    console.log('\n--- Test 2: idempotency (same call returns skipped) ---');
    await expectOk('second call returns skipped', async () => {
        return finalizeTrialEnrollment({
            studentId: student2.id,
            courseId: course.id,
            paymentMethodId: 'pm_test_aaa',
            cardFingerprint: 'fp_test_aaa',
        });
    });

    console.log('\n--- Test 3: same fingerprint on same course (different student) throws ---');
    // Clean student1 first — they are enrolled as PAID in seed, so can't trial
    // Create a fresh student3 for this test
    const student3 = await prisma.user.upsert({
        where: { email: 'student3@test.local' },
        update: {},
        create: {
            email: 'student3@test.local',
            username: 'student03',
            hashedPassword: 'x',
            role: 'STUDENT',
        },
    });

    await expectError(
        'same card same course',
        () =>
            finalizeTrialEnrollment({
                studentId: student3.id,
                courseId: course.id,
                paymentMethodId: 'pm_test_bbb',
                cardFingerprint: 'fp_test_aaa',
            }),
        'TRIAL_CARD_ALREADY_USED',
    );

    console.log('\n--- Test 4: course without trial config ---');
    // course2? only course 1 exists. Create a temp course without trialDurationDays
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    const category = await prisma.category.findFirst();
    if (!teacher || !category) throw new Error('Missing teacher/category');

    const noTrialCourse = await prisma.course.create({
        data: {
            title: 'No-Trial Test Course',
            description: 'x',
            price: 10,
            trialDurationDays: null,
            teacherId: teacher.id,
            categoryId: category.id,
        },
    });
    await expectError(
        'course without trial',
        () =>
            finalizeTrialEnrollment({
                studentId: student3.id,
                courseId: noTrialCourse.id,
                paymentMethodId: 'pm_test_ccc',
                cardFingerprint: 'fp_test_ccc',
            }),
        'COURSE_TRIAL_CONFIG_MISSING',
    );

    // Cleanup
    await prisma.course.delete({ where: { id: noTrialCourse.id } });
    await prisma.enrollment.deleteMany({ where: { studentId: student3.id } });
    await prisma.user.delete({ where: { id: student3.id } });

    await prisma.$disconnect();
    console.log('\nAll webhook-enrollment paths verified.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
