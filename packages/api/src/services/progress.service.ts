import { ContentType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Quiz scores are stored on a 0..100 scale (percentage of correct answers,
// see quiz.service.ts). Practice aiScore is 0..10. We treat both as
// "passing" when the student got >= 60% of the available points.
const QUIZ_PASS_PCT = 60; // out of 100
const PRACTICE_PASS_SCORE = 6; // out of 10

export type ContentProgress = {
    contentId: number;
    title: string;
    contentType: ContentType;
    completed: boolean;
    quizScore: number | null;
    practiceScore: number | null;
};

export type ModuleProgress = {
    moduleId: number;
    title: string;
    contents: ContentProgress[];
    completedCount: number;
    totalCount: number;
    moduleProgress: number; // 0..100
};

export type EnrollmentProgress = {
    enrollmentId: number;
    courseId: number;
    overallProgress: number; // 0..100
    completedCount: number;
    totalCount: number;
    modules: ModuleProgress[];
};

/**
 * A content is "completed" if any of:
 *   - VIDEO/DOCUMENT: a ContentCompletion row exists for (student, content)
 *   - QUIZ: best QuizAttempt.score (out of 10) >= PASS_THRESHOLD
 *           QuizAttempt.score is stored on a 0..10 scale today.
 *   - PRACTICE: best PracticeSubmission.aiScore >= PASS_THRESHOLD
 *               (null aiScore counts as not-passed)
 */
export async function computeProgress(enrollmentId: number): Promise<EnrollmentProgress | null> {
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: {
            id: true,
            courseId: true,
            studentId: true,
            course: {
                select: {
                    modules: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            title: true,
                            contents: {
                                orderBy: { order: 'asc' },
                                select: {
                                    id: true,
                                    title: true,
                                    contentType: true,
                                    practice: { select: { id: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!enrollment) return null;

    const studentId = enrollment.studentId;
    const allContentIds = enrollment.course.modules.flatMap((m) => m.contents.map((c) => c.id));
    const allPracticeIds = enrollment.course.modules
        .flatMap((m) => m.contents)
        .map((c) => c.practice?.id)
        .filter((x): x is number => typeof x === 'number');

    const [completionRows, quizAttempts, practiceSubs] = await Promise.all([
        prisma.contentCompletion.findMany({
            where: { studentId, contentId: { in: allContentIds } },
            select: { contentId: true },
        }),
        prisma.quizAttempt.findMany({
            where: { studentId, quizContentId: { in: allContentIds } },
            select: { quizContentId: true, score: true },
        }),
        prisma.practiceSubmission.findMany({
            where: { studentId, practiceId: { in: allPracticeIds } },
            select: { practiceId: true, aiScore: true },
        }),
    ]);

    const completedSet = new Set(completionRows.map((r) => r.contentId));

    const bestQuiz = new Map<number, number>();
    for (const a of quizAttempts) {
        const prev = bestQuiz.get(a.quizContentId) ?? -Infinity;
        if (a.score > prev) bestQuiz.set(a.quizContentId, a.score);
    }

    const bestPractice = new Map<number, number>();
    for (const s of practiceSubs) {
        if (s.aiScore === null) continue;
        const prev = bestPractice.get(s.practiceId) ?? -Infinity;
        if (s.aiScore > prev) bestPractice.set(s.practiceId, s.aiScore);
    }

    const modules: ModuleProgress[] = enrollment.course.modules.map((m) => {
        const contents: ContentProgress[] = m.contents.map((c) => {
            let completed = false;
            let quizScore: number | null = null;
            let practiceScore: number | null = null;

            if (c.contentType === 'QUIZ') {
                quizScore = bestQuiz.has(c.id) ? bestQuiz.get(c.id)! : null;
                completed = quizScore !== null && quizScore >= QUIZ_PASS_PCT;
            } else if (c.contentType === 'PRACTICE' && c.practice) {
                practiceScore = bestPractice.has(c.practice.id) ? bestPractice.get(c.practice.id)! : null;
                completed = practiceScore !== null && practiceScore >= PRACTICE_PASS_SCORE;
            } else {
                // VIDEO / DOCUMENT
                completed = completedSet.has(c.id);
            }

            return {
                contentId: c.id,
                title: c.title,
                contentType: c.contentType,
                completed,
                quizScore,
                practiceScore,
            };
        });

        const completedCount = contents.filter((c) => c.completed).length;
        const totalCount = contents.length;
        const moduleProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

        return {
            moduleId: m.id,
            title: m.title,
            contents,
            completedCount,
            totalCount,
            moduleProgress,
        };
    });

    const completedCount = modules.reduce((acc, m) => acc + m.completedCount, 0);
    const totalCount = modules.reduce((acc, m) => acc + m.totalCount, 0);
    const overallProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        overallProgress,
        completedCount,
        totalCount,
        modules,
    };
}

/**
 * Recompute progress for an enrollment and persist Enrollment.progress.
 * Best-effort — caller can ignore errors.
 */
export async function refreshEnrollmentProgress(enrollmentId: number): Promise<number | null> {
    const result = await computeProgress(enrollmentId);
    if (!result) return null;
    await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { progress: result.overallProgress },
    });
    return result.overallProgress;
}

/**
 * Helper for the controllers — find an enrollment by (studentId, courseId).
 */
export async function findEnrollmentForStudentCourse(
    studentId: number,
    courseId: number,
): Promise<{ id: number; isActive: boolean; expiresAt: Date | null } | null> {
    return prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        select: { id: true, isActive: true, expiresAt: true },
    });
}
