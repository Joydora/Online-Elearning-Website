import { ContentType, PrismaClient } from '@prisma/client';
import { Ollama } from 'ollama';

const prisma = new PrismaClient();

const ollamaHost = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma3:4b';
const ollama = new Ollama({ host: ollamaHost });

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

export type ProgressSummary = {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    generatedBy: 'ai' | 'fallback';
};

function buildSummaryPrompt(p: EnrollmentProgress): string {
    const lines: string[] = [];
    lines.push('Bạn là cố vấn học tập. Phân tích tiến độ học của một học viên và cho ra nhận xét NGẮN GỌN tiếng Việt.');
    lines.push('TRẢ LỜI PHẢI LÀ JSON HỢP LỆ, KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC.');
    lines.push('Định dạng: {"summary":"<2-3 câu>","strengths":["<điểm mạnh>",...],"weaknesses":["<điểm cần cải thiện>",...]}');
    lines.push(`OVERALL: ${p.completedCount}/${p.totalCount} (${p.overallProgress}%)`);
    lines.push('');
    lines.push('CHI TIẾT:');
    for (const m of p.modules) {
        lines.push(`Module "${m.title}" — ${m.completedCount}/${m.totalCount}`);
        for (const c of m.contents) {
            const score =
                c.quizScore !== null
                    ? ` quiz=${c.quizScore}/100`
                    : c.practiceScore !== null
                    ? ` practice=${c.practiceScore}/10`
                    : '';
            lines.push(`  [${c.completed ? '✓' : ' '}] ${c.contentType} ${c.title}${score}`);
        }
    }
    lines.push('');
    lines.push('JSON:');
    return lines.join('\n');
}

function extractJsonObject(raw: string): unknown | null {
    const start = raw.indexOf('{');
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                try { return JSON.parse(raw.slice(start, i + 1)); } catch { return null; }
            }
        }
    }
    return null;
}

function fallbackSummary(p: EnrollmentProgress): ProgressSummary {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const allContents = p.modules.flatMap((m) => m.contents);
    const strongQuizzes = allContents.filter((c) => c.quizScore !== null && c.quizScore >= 80);
    const weakQuizzes = allContents.filter((c) => c.quizScore !== null && c.quizScore < 60);
    const strongPractices = allContents.filter((c) => c.practiceScore !== null && c.practiceScore >= 8);
    const weakPractices = allContents.filter((c) => c.practiceScore !== null && c.practiceScore < 6);
    const skipped = allContents.filter((c) => !c.completed && c.quizScore === null && c.practiceScore === null);

    if (strongQuizzes.length) strengths.push(`Làm tốt ${strongQuizzes.length} bài kiểm tra (điểm ≥ 80).`);
    if (strongPractices.length) strengths.push(`Hoàn thành tốt ${strongPractices.length} bài thực hành.`);
    if (p.overallProgress >= 50) strengths.push(`Đã hoàn thành ${p.overallProgress}% khoá học.`);

    if (weakQuizzes.length) weaknesses.push(`${weakQuizzes.length} bài kiểm tra dưới 60 điểm — nên ôn lại.`);
    if (weakPractices.length) weaknesses.push(`${weakPractices.length} bài thực hành dưới điểm chuẩn.`);
    if (skipped.length) weaknesses.push(`Còn ${skipped.length} bài chưa hoàn thành.`);

    if (strengths.length === 0) strengths.push('Hãy bắt đầu hoàn thành các bài học đầu tiên.');
    if (weaknesses.length === 0) weaknesses.push('Tiếp tục duy trì tiến độ học hiện tại.');

    return {
        summary: `Tiến độ ${p.overallProgress}% (${p.completedCount}/${p.totalCount} bài).`,
        strengths,
        weaknesses,
        generatedBy: 'fallback',
    };
}

export async function summariseProgress(enrollmentId: number): Promise<ProgressSummary | null> {
    const p = await computeProgress(enrollmentId);
    if (!p) return null;

    if (p.totalCount === 0) {
        return { summary: 'Khoá học chưa có nội dung nào.', strengths: [], weaknesses: [], generatedBy: 'fallback' };
    }

    const prompt = buildSummaryPrompt(p);
    try {
        const response = await ollama.generate({ model: ollamaModel, prompt, stream: false });
        const parsed = extractJsonObject(response.response) as
            | { summary?: unknown; strengths?: unknown; weaknesses?: unknown }
            | null;
        if (!parsed) return fallbackSummary(p);

        const toStringArray = (raw: unknown): string[] =>
            Array.isArray(raw)
                ? raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 5)
                : [];

        return {
            summary:
                typeof parsed.summary === 'string' && parsed.summary.trim()
                    ? parsed.summary.trim()
                    : `Tiến độ ${p.overallProgress}%.`,
            strengths: toStringArray(parsed.strengths),
            weaknesses: toStringArray(parsed.weaknesses),
            generatedBy: 'ai',
        };
    } catch {
        return fallbackSummary(p);
    }
}
