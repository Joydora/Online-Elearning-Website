import { PrismaClient, ContentType, EnrollmentType } from '@prisma/client';
import { deepseek, DEEPSEEK_MODEL_FAST } from '../lib/deepseek';
import { issueCertificateForEnrollment } from './certificate.service';
import { recordActivity } from './gamification.service';

const prisma = new PrismaClient();

// EPIC 7: weighted progress formula
// video × 0.4 + quiz × 0.3 + practice × 0.3
async function calculateWeightedProgress(enrollmentId: number, courseId: number): Promise<number> {
    const allContents = await prisma.content.findMany({
        where: { module: { courseId } },
        select: { id: true, contentType: true },
    });

    if (allContents.length === 0) return 0;

    const videos = allContents.filter((c) => c.contentType === ContentType.VIDEO);
    const quizzes = allContents.filter((c) => c.contentType === ContentType.QUIZ);
    const practices = allContents.filter(
        (c) => c.contentType === ContentType.PRACTICE || c.contentType === ContentType.ASSIGNMENT,
    );
    const others = allContents.filter(
        (c) =>
            c.contentType !== ContentType.VIDEO &&
            c.contentType !== ContentType.QUIZ &&
            c.contentType !== ContentType.PRACTICE &&
            c.contentType !== ContentType.ASSIGNMENT,
    );

    const completed = await prisma.contentProgress.findMany({
        where: { enrollmentId },
        select: { contentId: true },
    });
    const completedSet = new Set(completed.map((c) => c.contentId));

    function pct(subset: typeof allContents) {
        if (subset.length === 0) return 1; // no content of this type = 100% for that bucket
        const done = subset.filter((c) => completedSet.has(c.id)).length;
        return done / subset.length;
    }

    const videoScore = pct(videos);
    const quizScore = pct(quizzes);
    const practiceScore = pct(practices);
    const otherScore = pct(others);

    // If category has no content, redistribute weight equally
    const hasVideo = videos.length > 0;
    const hasQuiz = quizzes.length > 0;
    const hasPractice = practices.length > 0;
    const hasOther = others.length > 0;

    let totalWeight = 0;
    let weightedSum = 0;

    if (hasVideo) { weightedSum += videoScore * 0.4; totalWeight += 0.4; }
    if (hasQuiz) { weightedSum += quizScore * 0.3; totalWeight += 0.3; }
    if (hasPractice) { weightedSum += practiceScore * 0.3; totalWeight += 0.3; }
    if (hasOther && !hasVideo && !hasQuiz && !hasPractice) { weightedSum += otherScore; totalWeight += 1; }
    else if (hasOther) { weightedSum += otherScore * 0.1; totalWeight += 0.1; }

    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 100);
}

export async function markContentCompleted(
    contentId: number,
    studentId: number,
    watchedSeconds?: number,
): Promise<{ progress: number; isCompleted: boolean }> {
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: { module: { include: { course: true } } },
    });
    if (!content) throw new Error('CONTENT_NOT_FOUND');

    const courseId = content.module.courseId;

    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
    });
    if (!enrollment) throw new Error('NOT_ENROLLED');
    const isExpired = enrollment.expiresAt !== null && enrollment.expiresAt.getTime() <= Date.now();
    if (!enrollment.isActive || isExpired) throw new Error('ENROLLMENT_EXPIRED');
    if (enrollment.type === EnrollmentType.TRIAL && !content.isFreePreview) throw new Error('CONTENT_LOCKED');

    await prisma.contentProgress.upsert({
        where: { enrollmentId_contentId: { enrollmentId: enrollment.id, contentId } },
        update: {
            completedAt: new Date(),
            ...(watchedSeconds !== undefined ? { watchedSeconds } : {}),
        },
        create: { enrollmentId: enrollment.id, contentId, watchedSeconds },
    });

    const progress = await calculateWeightedProgress(enrollment.id, courseId);
    const isCompleted = progress >= 100;

    const completedAt = isCompleted ? new Date() : enrollment.completionDate;

    await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress, completionDate: completedAt },
    });

    // ─── Gamification: record activity & award XP ───
    const xpMap: Record<string, number> = {
        VIDEO: 10, DOCUMENT: 8, QUIZ: 20, PRACTICE: 25, ASSIGNMENT: 30,
    };
    const xpBase = xpMap[content.contentType] ?? 10;
    recordActivity(studentId, 'CONTENT_COMPLETED', xpBase, {
        contentId, courseId, contentType: content.contentType,
    }).catch((err) => console.error('[gamification] recordActivity failed:', err));

    if (isCompleted && completedAt) {
        await issueCertificateForEnrollment(enrollment.id).catch((error) => {
            console.error('Unable to issue course certificate:', error);
        });

        // Gamification: course completion bonus
        recordActivity(studentId, 'COURSE_COMPLETED', 100, { courseId }).catch((err) =>
            console.error('[gamification] course completion recordActivity failed:', err),
        );
    }

    return { progress, isCompleted };
}

// EPIC 7: detailed progress breakdown
export async function getDetailedProgress(courseId: number, studentId: number) {
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        include: { contentProgresses: { select: { contentId: true, watchedSeconds: true, completedAt: true } } },
    });
    if (!enrollment) throw new Error('NOT_ENROLLED');

    const completedSet = new Map(enrollment.contentProgresses.map((cp) => [cp.contentId, cp]));

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                orderBy: { order: 'asc' },
                include: {
                    contents: {
                        orderBy: { order: 'asc' },
                        select: { id: true, title: true, contentType: true, durationInSeconds: true },
                    },
                },
            },
        },
    });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    // Best quiz score per quiz content
    const quizScores = await prisma.quizAttempt.findMany({
        where: { studentId, quizContent: { module: { courseId } } },
        select: { quizContentId: true, score: true },
    });
    const bestQuizScore = new Map<number, number>();
    for (const qs of quizScores) {
        const cur = bestQuizScore.get(qs.quizContentId) ?? 0;
        if (qs.score > cur) bestQuizScore.set(qs.quizContentId, qs.score);
    }

    // Best practice submission
    const practiceSubmissions = await prisma.practiceSubmission.findMany({
        where: { studentId, practice: { content: { module: { courseId } } } },
        include: { practice: { select: { contentId: true } } },
    });
    const bestPracticeScore = new Map<number, { score: number; passed: boolean }>();
    for (const ps of practiceSubmissions) {
        const contentId = ps.practice.contentId;
        const cur = bestPracticeScore.get(contentId);
        if (!cur || (ps.score ?? 0) > cur.score) {
            bestPracticeScore.set(contentId, { score: ps.score ?? 0, passed: ps.passed });
        }
    }

    const modules = course.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        contents: mod.contents.map((c) => {
            const cp = completedSet.get(c.id);
            return {
                id: c.id,
                title: c.title,
                contentType: c.contentType,
                completed: !!cp,
                completedAt: cp?.completedAt ?? null,
                watchedSeconds: cp?.watchedSeconds ?? null,
                quizScore: bestQuizScore.get(c.id) ?? null,
                practiceScore: bestPracticeScore.get(c.id) ?? null,
            };
        }),
    }));

    return {
        enrollmentId: enrollment.id,
        progress: enrollment.progress,
        completionDate: enrollment.completionDate,
        type: enrollment.type,
        expiresAt: enrollment.expiresAt,
        isActive: enrollment.isActive,
        modules,
    };
}

// EPIC 7: AI summary of strengths and weaknesses
export async function getProgressAISummary(courseId: number, studentId: number): Promise<string> {
    const detail = await getDetailedProgress(courseId, studentId);

    const completedCount = detail.modules.flatMap((m) => m.contents).filter((c) => c.completed).length;
    const totalCount = detail.modules.flatMap((m) => m.contents).length;

    const quizScores = detail.modules
        .flatMap((m) => m.contents)
        .filter((c) => c.quizScore !== null)
        .map((c) => ({ title: c.title, score: c.quizScore }));

    const practiceScores = detail.modules
        .flatMap((m) => m.contents)
        .filter((c) => c.practiceScore !== null)
        .map((c) => ({ title: c.title, ...c.practiceScore }));

    const prompt = `The student has completed ${completedCount}/${totalCount} course items (progress: ${detail.progress}%).
${quizScores.length > 0 ? `Quiz scores: ${quizScores.map((q) => `${q.title}: ${q.score}%`).join(', ')}` : ''}
${practiceScores.length > 0 ? `Practice: ${practiceScores.map((p) => `${p.title}: ${p.passed ? 'Passed' : 'Failed'}`).join(', ')}` : ''}

Please provide a brief summary (2-3 sentences) in English about this student's strengths and areas for improvement.`;

    try {
        const response = await deepseek.chat.completions.create({
            model: DEEPSEEK_MODEL_FAST,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });
        return (response.choices[0].message.content ?? '').trim();
    } catch {
        return `You have completed ${detail.progress}% of the course. Keep up the good work to achieve better results!`;
    }
}

export async function getCompletedContents(courseId: number, studentId: number): Promise<number[]> {
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        include: { contentProgresses: { select: { contentId: true } } },
    });
    if (!enrollment) return [];
    return enrollment.contentProgresses.map((cp) => cp.contentId);
}

export async function unmarkContentCompleted(
    contentId: number,
    studentId: number,
): Promise<{ progress: number }> {
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: { module: true },
    });
    if (!content) throw new Error('CONTENT_NOT_FOUND');

    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId: content.module.courseId } },
    });
    if (!enrollment) throw new Error('NOT_ENROLLED');

    await prisma.contentProgress.deleteMany({
        where: { enrollmentId: enrollment.id, contentId },
    });

    const progress = await calculateWeightedProgress(enrollment.id, content.module.courseId);

    await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress, completionDate: null },
    });

    return { progress };
}
