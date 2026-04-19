import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { computeProgress, refreshEnrollmentProgress } from '../src/services/progress.service';

const prisma = new PrismaClient();

async function main() {
    // Use existing seeded enrollment: student1 (id 3) on course 1 (PAID)
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: 3, courseId: 1 } },
    });
    if (!enrollment) throw new Error('seed enrollment missing');

    // Clean prior runs
    await prisma.contentCompletion.deleteMany({ where: { studentId: 3 } });
    await prisma.quizAttempt.deleteMany({ where: { studentId: 3 } });
    await prisma.practiceSubmission.deleteMany({ where: { studentId: 3 } });

    console.log('--- Test 1: nothing completed ---');
    let p = await computeProgress(enrollment.id);
    if (!p) throw new Error('null result');
    console.log(`  overall=${p.overallProgress}% (${p.completedCount}/${p.totalCount})`);
    console.log(`  ${p.overallProgress === 0 ? '✅' : '❌'} 0% when no signals`);

    console.log('\n--- Test 2: mark video #1 done → progress goes up ---');
    await prisma.contentCompletion.create({ data: { studentId: 3, contentId: 1 } });
    p = await computeProgress(enrollment.id);
    if (!p) throw new Error('null');
    console.log(`  overall=${p.overallProgress}% (${p.completedCount}/${p.totalCount})`);
    console.log(`  module 1 contents:`);
    p.modules[0].contents.forEach((c) => console.log(`    [${c.completed ? '✓' : ' '}] ${c.title}`));
    const exp = Math.round((1 / p.totalCount) * 100);
    console.log(`  ${p.overallProgress === exp ? '✅' : '❌'} expected ${exp}%, got ${p.overallProgress}%`);

    console.log('\n--- Test 3: quiz pass (score=8) → counted as completed ---');
    // content id 3 is the quiz in seed
    await prisma.quizAttempt.create({ data: { studentId: 3, quizContentId: 3, score: 8, startTime: new Date(), endTime: new Date() } });
    p = await computeProgress(enrollment.id);
    if (!p) throw new Error('null');
    const quizContent = p.modules.flatMap(m => m.contents).find(c => c.contentId === 3)!;
    console.log(`  quiz completed=${quizContent.completed}, score=${quizContent.quizScore}`);
    console.log(`  ${quizContent.completed && quizContent.quizScore === 8 ? '✅' : '❌'} quiz pass detected`);

    console.log('\n--- Test 4: quiz fail (score=4) → not counted ---');
    // Add a low attempt — best-of logic should still see the 8 we just inserted, so completed stays true.
    // Test by deleting the high score and adding a low one.
    await prisma.quizAttempt.deleteMany({ where: { studentId: 3, quizContentId: 3 } });
    await prisma.quizAttempt.create({ data: { studentId: 3, quizContentId: 3, score: 4, startTime: new Date(), endTime: new Date() } });
    p = await computeProgress(enrollment.id);
    if (!p) throw new Error('null');
    const quizFail = p.modules.flatMap(m => m.contents).find(c => c.contentId === 3)!;
    console.log(`  quiz completed=${quizFail.completed}, score=${quizFail.quizScore}`);
    console.log(`  ${!quizFail.completed && quizFail.quizScore === 4 ? '✅' : '❌'} sub-threshold quiz NOT counted`);

    console.log('\n--- Test 5: refreshEnrollmentProgress persists Enrollment.progress ---');
    const before = (await prisma.enrollment.findUnique({ where: { id: enrollment.id } }))!.progress;
    const refreshed = await refreshEnrollmentProgress(enrollment.id);
    const after = (await prisma.enrollment.findUnique({ where: { id: enrollment.id } }))!.progress;
    console.log(`  before=${before}, refreshed=${refreshed}, after=${after}`);
    console.log(`  ${after === refreshed ? '✅' : '❌'} progress persisted`);

    // Cleanup
    await prisma.contentCompletion.deleteMany({ where: { studentId: 3 } });
    await prisma.quizAttempt.deleteMany({ where: { studentId: 3 } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { progress: 0 } });

    await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
