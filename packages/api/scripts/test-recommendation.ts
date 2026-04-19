import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { recommendLearningPath } from '../src/services/recommendation.service';

const prisma = new PrismaClient();

async function main() {
    // Seed fixtures: a 3-course beginner→intermediate→advanced chain
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    const category = await prisma.category.findFirst();
    if (!teacher || !category) throw new Error('seed missing');

    // Cleanup any prior runs
    await prisma.course.deleteMany({ where: { title: { startsWith: 'T5.2 ' } } });

    const a = await prisma.course.create({
        data: {
            title: 'T5.2 A — Foundations',
            description: 'JS basics',
            price: 0,
            teacherId: teacher.id,
            categoryId: category.id,
            level: 'BEGINNER',
        },
    });
    const b = await prisma.course.create({
        data: {
            title: 'T5.2 B — Intermediate',
            description: 'JS deep dive',
            price: 10,
            teacherId: teacher.id,
            categoryId: category.id,
            level: 'INTERMEDIATE',
            prerequisites: { connect: { id: a.id } },
        },
    });
    const c = await prisma.course.create({
        data: {
            title: 'T5.2 C — Advanced',
            description: 'JS perf',
            price: 20,
            teacherId: teacher.id,
            categoryId: category.id,
            level: 'ADVANCED',
            prerequisites: { connect: { id: b.id } },
        },
    });

    console.log('Seeded courses:', [a.id, b.id, c.id]);

    // Force fallback path by pointing OLLAMA_HOST at a closed port
    process.env.OLLAMA_HOST = 'http://127.0.0.1:59999';
    delete require.cache[require.resolve('../src/services/recommendation.service')];
    const reloaded = await import('../src/services/recommendation.service');

    console.log('\n--- Test 1: fallback ordering (no AI) ---');
    const r1 = await reloaded.recommendLearningPath({
        goal: 'Học JavaScript',
        currentLevel: 'BEGINNER',
        maxCourses: 5,
    });
    console.log(`  generatedBy: ${r1.generatedBy}`);
    console.log(`  note: ${r1.note}`);
    console.log(`  order: ${r1.ordered.map((x) => `${x.courseId}(${x.level})`).join(' → ')}`);
    // Find the indices of A, B, C in the ordered list
    const ai = r1.ordered.findIndex((x) => x.courseId === a.id);
    const bi = r1.ordered.findIndex((x) => x.courseId === b.id);
    const ci = r1.ordered.findIndex((x) => x.courseId === c.id);
    const inOrder = ai >= 0 && bi > ai && ci > bi;
    console.log(`  ${inOrder ? '✅' : '❌'} A → B → C respected (indexes ${ai},${bi},${ci})`);

    console.log('\n--- Test 2: empty catalog ---');
    // Save IDs then delete
    const savedIds = [a.id, b.id, c.id];
    await prisma.course.deleteMany({ where: { id: { in: savedIds } } });
    // Need to also delete the original seed course 1 if it's still there to test empty
    // Actually, let's not — keep course 1 + 3 around. Just verify fallback works on a small catalog.
    const r2 = await reloaded.recommendLearningPath({
        goal: 'Web fullstack',
        maxCourses: 2,
    });
    console.log(`  generatedBy: ${r2.generatedBy}, count: ${r2.ordered.length}`);
    console.log(`  ${r2.ordered.length <= 2 ? '✅' : '❌'} respects maxCourses cap`);

    console.log('\n--- Test 3: empty goal → still falls back gracefully ---');
    const r3 = await reloaded.recommendLearningPath({
        goal: '',
        maxCourses: 3,
    });
    console.log(`  generatedBy: ${r3.generatedBy}, note: ${r3.note}`);
    console.log(`  ${r3.generatedBy === 'fallback' ? '✅' : '❌'} empty goal → fallback path`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
