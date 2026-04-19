import { PrismaClient, ContentType } from '@prisma/client';

const prisma = new PrismaClient();

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

async function assertStudentEnrollment(courseId: number, studentId: number): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: {
                studentId,
                courseId,
            },
        },
        select: { isActive: true, expiresAt: true },
    });

    if (!enrollment) {
        throw new Error('NOT_ENROLLED');
    }

    if (!enrollment.isActive || (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now())) {
        throw new Error('ENROLLMENT_EXPIRED');
    }
}

type QuizContentWithQuestions = Awaited<ReturnType<typeof loadQuizContentWithQuestions>>;

async function loadQuizContentWithQuestions(contentId: number): Promise<{
    contentId: number;
    title: string;
    timeLimitInMinutes: number | null;
    courseId: number;
    questions: Array<{
        id: number;
        questionText: string;
        options: Array<{
            id: number;
            optionText: string;
            isCorrect: boolean;
        }>;
    }>;
}> {
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            id: true,
            title: true,
            timeLimitInMinutes: true,
            contentType: true,
            module: {
                select: {
                    courseId: true,
                },
            },
            questions: {
                orderBy: { id: 'asc' },
                select: {
                    id: true,
                    questionText: true,
                    options: {
                        orderBy: { id: 'asc' },
                        select: {
                            id: true,
                            optionText: true,
                            isCorrect: true,
                        },
                    },
                },
            },
        },
    });

    if (!content || !content.module) {
        throw new Error('QUIZ_NOT_FOUND');
    }

    if (content.contentType !== ContentType.QUIZ) {
        throw new Error('NOT_A_QUIZ');
    }

    return {
        contentId: content.id,
        title: content.title,
        timeLimitInMinutes: content.timeLimitInMinutes ?? null,
        courseId: content.module.courseId,
        questions: content.questions.map((question) => ({
            id: question.id,
            questionText: question.questionText,
            options: question.options.map((option) => ({
                id: option.id,
                optionText: option.optionText,
                isCorrect: option.isCorrect,
            })),
        })),
    };
}

export async function getQuizForStudent(contentId: number, studentId: number) {
    const quiz = await loadQuizContentWithQuestions(contentId);
    await assertStudentEnrollment(quiz.courseId, studentId);

    return {
        contentId: quiz.contentId,
        title: quiz.title,
        timeLimitInMinutes: quiz.timeLimitInMinutes,
        questions: quiz.questions.map((question) => ({
            id: question.id,
            questionText: question.questionText,
            options: question.options.map((option) => ({
                id: option.id,
                optionText: option.optionText,
            })),
        })),
    };
}

type SubmittedAnswer = {
    questionId: number;
    answerOptionId: number;
};

export async function submitQuizAnswers(contentId: number, studentId: number, rawAnswers: unknown) {
    const quiz = await loadQuizContentWithQuestions(contentId);
    await assertStudentEnrollment(quiz.courseId, studentId);

    if (!Array.isArray(rawAnswers)) {
        throw new Error('INVALID_ANSWERS');
    }

    const answers: SubmittedAnswer[] = rawAnswers
        .map((entry) => {
            const questionId = toNumber((entry as SubmittedAnswer)?.questionId);
            const answerOptionId = toNumber((entry as SubmittedAnswer)?.answerOptionId);

            if (questionId === null || answerOptionId === null) {
                return null;
            }

            return { questionId, answerOptionId };
        })
        .filter((entry): entry is SubmittedAnswer => entry !== null);

    if (answers.length === 0) {
        throw new Error('INVALID_ANSWERS');
    }

    const answerMap = new Map<number, number>();
    answers.forEach((answer) => {
        if (!answerMap.has(answer.questionId)) {
            answerMap.set(answer.questionId, answer.answerOptionId);
        }
    });

    const totalQuestions = quiz.questions.length;

    if (totalQuestions === 0) {
        throw new Error('QUIZ_HAS_NO_QUESTIONS');
    }

    let correctCount = 0;

    quiz.questions.forEach((question) => {
        const submittedOptionId = answerMap.get(question.id);

        if (!submittedOptionId) {
            return;
        }

        const option = question.options.find((item) => item.id === submittedOptionId);

        if (!option) {
            throw new Error('ANSWER_OPTION_NOT_FOUND');
        }

        if (option.isCorrect) {
            correctCount += 1;
        }
    });

    const score = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const now = new Date();

    const attempt = await prisma.quizAttempt.create({
        data: {
            score,
            startTime: now,
            endTime: now,
            studentId,
            quizContentId: quiz.contentId,
        },
    });

    return {
        attemptId: attempt.id,
        score,
        correctCount,
        totalQuestions,
    };
}
