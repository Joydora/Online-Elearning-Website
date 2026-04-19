import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runExpirySweep } from '../src/jobs/expireEnrollments';

const prisma = new PrismaClient();

async function main() {
    const student = await prisma.user.findUnique({ where: { email: 'student2@gmail.com' } });
    const course = await prisma.course.findUnique({ where: { id: 1 } });
    if (!student || !course) throw new Error('seed missing');

    // clean slate
    await prisma.payment.deleteMany({ where: { enrollment: { studentId: student.id } } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });

    // Seed three enrollments:
    //   a — expired yesterday, isActive=true (should be flipped)
    //   b — expires in +5 days, isActive=true (should stay active)
    //   c — expired 2 days ago, isActive=true on a second course (we'll fake by creating via direct SQL on a second student and course)
    const other = await prisma.user.findUnique({ where: { email: 'student1@gmail.com' } });
    if (!other) throw new Error('student1 missing');

    // Create course 2 so we can enroll student1 without colliding with their existing course-1 row
    const categoryId = (await prisma.category.findFirst())!.id;
    const teacherId = (await prisma.user.findFirst({ where: { role: 'TEACHER' } }))!.id;
    const tempCourse = await prisma.course.create({
        data: { title: 'T2.4 temp', description: 'x', price: 10, categoryId, teacherId },
    });

    const yesterday = new Date(Date.now() - 86_400_000);
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    const plus5 = new Date(Date.now() + 5 * 86_400_000);

    const a = await prisma.enrollment.create({
        data: { studentId: student.id, courseId: course.id, type: 'PAID', expiresAt: yesterday, isActive: true },
    });
    const b = await prisma.enrollment.create({
        data: { studentId: student.id, courseId: tempCourse.id, type: 'PAID', expiresAt: plus5, isActive: true },
    });
    // Simulate an already-inactive row to make sure sweep doesn't double-count it
    const c = await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId: other.id, courseId: tempCourse.id } },
        create: { studentId: other.id, courseId: tempCourse.id, type: 'PAID', expiresAt: twoDaysAgo, isActive: false },
        update: { expiresAt: twoDaysAgo, isActive: false },
    });

    console.log('Before sweep:');
    console.log(`  a (expired yesterday, active): isActive=${a.isActive}`);
    console.log(`  b (future, active):            isActive=${b.isActive}`);
    console.log(`  c (already inactive):          isActive=${c.isActive}`);

    const flipped = await runExpirySweep();
    console.log(`\nSweep reported: ${flipped} row(s) flipped`);

    const aAfter = await prisma.enrollment.findUnique({ where: { id: a.id } });
    const bAfter = await prisma.enrollment.findUnique({ where: { id: b.id } });
    const cAfter = await prisma.enrollment.findUnique({ where: { id: c.id } });

    console.log('\nAfter sweep:');
    console.log(`  a isActive=${aAfter?.isActive} (expected false)`);
    console.log(`  b isActive=${bAfter?.isActive} (expected true)`);
    console.log(`  c isActive=${cAfter?.isActive} (expected false, was already)`);

    const ok = flipped === 1 && aAfter?.isActive === false && bAfter?.isActive === true && cAfter?.isActive === false;
    console.log(`\n${ok ? '✅' : '❌'} expiry sweep behaves correctly (flipped exactly 1 active-expired row)`);

    // cleanup
    await prisma.enrollment.deleteMany({ where: { courseId: tempCourse.id } });
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
    await prisma.course.delete({ where: { id: tempCourse.id } });

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
