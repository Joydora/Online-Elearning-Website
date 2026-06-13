import { PrismaClient, ContentType, EnrollmentType, Role, VideoQuizBlockingMode } from '@prisma/client';
import { markContentCompleted } from './progress.service';

const prisma = new PrismaClient();

type MarkerBlockingMode = 'pause' | 'non-blocking';

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

function toPrismaBlockingMode(value: unknown): VideoQuizBlockingMode {
    if (value === 'non-blocking' || value === VideoQuizBlockingMode.NON_BLOCKING) {
        return VideoQuizBlockingMode.NON_BLOCKING;
    }

    return VideoQuizBlockingMode.PAUSE;
}

function fromPrismaBlockingMode(value: VideoQuizBlockingMode): MarkerBlockingMode {
    return value === VideoQuizBlockingMode.NON_BLOCKING ? 'non-blocking' : 'pause';
}

async function assertStudentEnrollment(courseId: number, studentId: number, isFreePreview = false): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: {
                studentId,
                courseId,
            },
        },
    });

    if (!enrollment) {
        throw new Error('NOT_ENROLLED');
    }

    const isExpired = enrollment.expiresAt !== null && enrollment.expiresAt.getTime() <= Date.now();
    if (!enrollment.isActive || isExpired) {
        throw new Error('ENROLLMENT_EXPIRED');
    }

    if (enrollment.type === EnrollmentType.TRIAL && !isFreePreview) {
        throw new Error('CONTENT_LOCKED');
    }
}

type QuizContentWithQuestions = Awaited<ReturnType<typeof loadQuizContentWithQuestions>>;

async function loadQuizContentWithQuestions(contentId: number): Promise<{
    contentId: number;
    title: string;
    timeLimitInMinutes: number | null;
    isFreePreview: boolean;
    courseId: number;
    questions: Array<{
        id: number;
        questionText: string;
        explanation: string | null;
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
            isFreePreview: true,
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
                    explanation: true,
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
        isFreePreview: content.isFreePreview,
        courseId: content.module.courseId,
        questions: content.questions.map((question) => ({
            id: question.id,
            questionText: question.questionText,
            explanation: question.explanation ?? null,
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
    await assertStudentEnrollment(quiz.courseId, studentId, quiz.isFreePreview);

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

function canManageCourse(userRole: Role | string | undefined, teacherId: number, userId: number): boolean {
    return userRole === Role.ADMIN || teacherId === userId;
}

function serializeMarker(marker: {
    id: number;
    timestampSec: number;
    blockingMode: VideoQuizBlockingMode;
    question: {
        id: number;
        questionText: string;
        contentId: number;
        content: {
            id: number;
            title: string;
        };
        options: Array<{
            id: number;
            optionText: string;
        }>;
    };
}) {
    return {
        id: marker.id,
        timestampSec: marker.timestampSec,
        blockingMode: fromPrismaBlockingMode(marker.blockingMode),
        questionId: marker.question.id,
        quizContentId: marker.question.contentId,
        quizTitle: marker.question.content.title,
        question: {
            id: marker.question.id,
            questionText: marker.question.questionText,
            options: marker.question.options,
        },
    };
}

export async function getVideoQuizMarkersForContent(
    contentId: number,
    userId: number,
    userRole?: Role | string
) {
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            id: true,
            contentType: true,
            isFreePreview: true,
            module: {
                select: {
                    courseId: true,
                    course: {
                        select: {
                            teacherId: true,
                        },
                    },
                },
            },
        },
    });

    if (!content || !content.module) {
        throw new Error('CONTENT_NOT_FOUND');
    }

    if (content.contentType !== ContentType.VIDEO) {
        throw new Error('NOT_A_VIDEO');
    }

    if (userRole === Role.STUDENT) {
        await assertStudentEnrollment(content.module.courseId, userId, content.isFreePreview);
    } else if (!canManageCourse(userRole, content.module.course.teacherId, userId)) {
        throw new Error('COURSE_FORBIDDEN');
    }

    const markers = await prisma.videoQuizMarker.findMany({
        where: { contentId },
        orderBy: [{ timestampSec: 'asc' }, { id: 'asc' }],
        select: {
            id: true,
            timestampSec: true,
            blockingMode: true,
            question: {
                select: {
                    id: true,
                    questionText: true,
                    contentId: true,
                    content: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    options: {
                        orderBy: { id: 'asc' },
                        select: {
                            id: true,
                            optionText: true,
                        },
                    },
                },
            },
        },
    });

    return markers.map(serializeMarker);
}

export async function createVideoQuizMarker(input: {
    contentId: number;
    timestampSec: number;
    questionId: number;
    blockingMode?: unknown;
    teacherId: number;
    userRole?: Role | string;
}) {
    const content = await prisma.content.findUnique({
        where: { id: input.contentId },
        select: {
            id: true,
            contentType: true,
            durationInSeconds: true,
            module: {
                select: {
                    courseId: true,
                    course: {
                        select: {
                            teacherId: true,
                        },
                    },
                },
            },
        },
    });

    if (!content || !content.module) {
        throw new Error('CONTENT_NOT_FOUND');
    }

    if (content.contentType !== ContentType.VIDEO) {
        throw new Error('NOT_A_VIDEO');
    }

    if (!canManageCourse(input.userRole, content.module.course.teacherId, input.teacherId)) {
        throw new Error('COURSE_FORBIDDEN');
    }

    if (input.timestampSec < 0 || !Number.isInteger(input.timestampSec)) {
        throw new Error('INVALID_TIMESTAMP');
    }

    if (content.durationInSeconds !== null && input.timestampSec > content.durationInSeconds) {
        throw new Error('INVALID_TIMESTAMP');
    }

    const question = await prisma.question.findUnique({
        where: { id: input.questionId },
        select: {
            id: true,
            content: {
                select: {
                    contentType: true,
                    module: {
                        select: {
                            courseId: true,
                        },
                    },
                },
            },
        },
    });

    if (!question) {
        throw new Error('QUESTION_NOT_FOUND');
    }

    if (question.content.contentType !== ContentType.QUIZ) {
        throw new Error('QUESTION_NOT_IN_QUIZ');
    }

    if (question.content.module.courseId !== content.module.courseId) {
        throw new Error('QUESTION_COURSE_MISMATCH');
    }

    const marker = await prisma.videoQuizMarker.create({
        data: {
            contentId: input.contentId,
            timestampSec: input.timestampSec,
            questionId: input.questionId,
            blockingMode: toPrismaBlockingMode(input.blockingMode),
        },
        select: {
            id: true,
            timestampSec: true,
            blockingMode: true,
            question: {
                select: {
                    id: true,
                    questionText: true,
                    contentId: true,
                    content: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    options: {
                        orderBy: { id: 'asc' },
                        select: {
                            id: true,
                            optionText: true,
                        },
                    },
                },
            },
        },
    });

    return serializeMarker(marker);
}

export async function deleteVideoQuizMarker(markerId: number, teacherId: number, userRole?: Role | string) {
    const marker = await prisma.videoQuizMarker.findUnique({
        where: { id: markerId },
        select: {
            content: {
                select: {
                    module: {
                        select: {
                            course: {
                                select: {
                                    teacherId: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!marker) {
        throw new Error('MARKER_NOT_FOUND');
    }

    if (!canManageCourse(userRole, marker.content.module.course.teacherId, teacherId)) {
        throw new Error('COURSE_FORBIDDEN');
    }

    await prisma.videoQuizMarker.delete({
        where: { id: markerId },
    });

    return { success: true };
}

export async function submitVideoQuizMarkerAnswer(
    markerId: number,
    studentId: number,
    rawAnswerOptionId: unknown
) {
    const answerOptionId = toNumber(rawAnswerOptionId);

    if (answerOptionId === null) {
        throw new Error('INVALID_ANSWER');
    }

    const marker = await prisma.videoQuizMarker.findUnique({
        where: { id: markerId },
        select: {
            id: true,
            question: {
                select: {
                    id: true,
                    contentId: true,
                    options: {
                        select: {
                            id: true,
                            isCorrect: true,
                        },
                    },
                    content: {
                        select: {
                            isFreePreview: true,
                            module: {
                                select: {
                                    courseId: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!marker) {
        throw new Error('MARKER_NOT_FOUND');
    }

    await assertStudentEnrollment(
        marker.question.content.module.courseId,
        studentId,
        marker.question.content.isFreePreview,
    );

    const selectedOption = marker.question.options.find((option) => option.id === answerOptionId);

    if (!selectedOption) {
        throw new Error('ANSWER_OPTION_NOT_FOUND');
    }

    const score = selectedOption.isCorrect ? 100 : 0;
    const now = new Date();

    const attempt = await prisma.quizAttempt.create({
        data: {
            score,
            startTime: now,
            endTime: now,
            studentId,
            quizContentId: marker.question.contentId,
        },
    });

    const progress = await markContentCompleted(marker.question.contentId, studentId);

    return {
        markerId: marker.id,
        attemptId: attempt.id,
        score,
        correctCount: selectedOption.isCorrect ? 1 : 0,
        totalQuestions: 1,
        progress,
    };
}

type SubmittedAnswer = {
    questionId: number;
    answerOptionId: number;
};

export async function submitQuizAnswers(contentId: number, studentId: number, rawAnswers: unknown) {
    const quiz = await loadQuizContentWithQuestions(contentId);
    await assertStudentEnrollment(quiz.courseId, studentId, quiz.isFreePreview);

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

    // Check if the student has ever passed this quiz (highest score >= 50)
    // to allow review if they previously passed even if this attempt failed.
    const highestAttempt = await prisma.quizAttempt.findFirst({
        where: {
            studentId,
            quizContentId: quiz.contentId,
        },
        orderBy: { score: 'desc' },
        select: { score: true },
    });
    
    const bestScore = highestAttempt ? Math.max(highestAttempt.score, score) : score;
    const passed = bestScore >= 50;

    const questionsReview = quiz.questions.map((question) => {
        const submittedOptionId = answerMap.get(question.id) ?? null;
        const submittedOption = question.options.find((o) => o.id === submittedOptionId);
        const isSubmittedCorrect = submittedOption ? submittedOption.isCorrect : false;

        return {
            id: question.id,
            questionText: question.questionText,
            submittedOptionId,
            isSubmittedCorrect,
            explanation: passed ? (question.explanation ?? null) : null,
            options: question.options.map((option) => ({
                id: option.id,
                optionText: option.optionText,
                isCorrect: passed ? option.isCorrect : undefined,
            })),
        };
    });

    return {
        attemptId: attempt.id,
        score,
        correctCount,
        totalQuestions,
        passed,
        questions: questionsReview,
    };
}

/**
 * Get all quiz attempts for a student
 */
export async function getQuizHistory(studentId: number) {
    const attempts = await prisma.quizAttempt.findMany({
        where: { studentId },
        orderBy: { endTime: 'desc' },
        select: {
            id: true,
            score: true,
            startTime: true,
            endTime: true,
            quizContent: {
                select: {
                    id: true,
                    title: true,
                    module: {
                        select: {
                            title: true,
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                    thumbnailUrl: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    return attempts
        .filter(attempt => attempt.quizContent.module !== null)
        .map(attempt => ({
            attemptId: attempt.id,
            score: attempt.score,
            startTime: attempt.startTime,
            endTime: attempt.endTime,
            quiz: {
                contentId: attempt.quizContent.id,
                title: attempt.quizContent.title,
                moduleName: attempt.quizContent.module!.title,
            },
            course: {
                id: attempt.quizContent.module!.course.id,
                title: attempt.quizContent.module!.course.title,
                thumbnailUrl: attempt.quizContent.module!.course.thumbnailUrl,
            },
        }));
}

/**
 * Get quiz attempts for a specific quiz content
 */
export async function getQuizAttempts(contentId: number, studentId: number) {
    // Verify student can access this quiz
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            isFreePreview: true,
            module: {
                select: { courseId: true },
            },
        },
    });

    if (!content?.module) {
        throw new Error('QUIZ_NOT_FOUND');
    }

    await assertStudentEnrollment(content.module.courseId, studentId, content.isFreePreview);

    const attempts = await prisma.quizAttempt.findMany({
        where: {
            studentId,
            quizContentId: contentId,
        },
        orderBy: { endTime: 'desc' },
        select: {
            id: true,
            score: true,
            startTime: true,
            endTime: true,
        },
    });

    return attempts.map(attempt => ({
        attemptId: attempt.id,
        score: attempt.score,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
    }));
}