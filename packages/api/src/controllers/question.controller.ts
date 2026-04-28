import { Request, Response } from 'express';
import { PrismaClient, ContentType, Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';

const prisma = new PrismaClient();

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

function getTeacherId(req: AuthenticatedRequest): number | null {
    // Allow both TEACHER and ADMIN to manage quizzes
    if (!req.user || (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN)) {
        return null;
    }
    return req.user.userId;
}

// Create question for quiz
export async function createQuestionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { contentId, questionText } = authReq.body ?? {};

        if (!contentId || !questionText) {
            return res.status(400).json({ error: 'contentId and questionText are required' });
        }

        const numericContentId = Number(contentId);

        if (!Number.isInteger(numericContentId)) {
            return res.status(400).json({ error: 'contentId must be an integer' });
        }

        // Verify content is a quiz and teacher owns it
        const content = await prisma.content.findUnique({
            where: { id: numericContentId },
            select: {
                contentType: true,
                module: {
                    select: {
                        courseId: true,
                        course: {
                            select: { teacherId: true },
                        },
                    },
                },
            },
        });

        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        if (content.contentType !== ContentType.QUIZ) {
            return res.status(400).json({ error: 'Content is not a quiz' });
        }

        // Admin can create questions for any quiz
        if (authReq.user?.role !== 'ADMIN' && content.module.course.teacherId !== teacherId) {
            return res.status(403).json({ error: 'You are not the owner of this course' });
        }

        // Create question
        const question = await prisma.question.create({
            data: {
                questionText,
                contentId: numericContentId,
            },
            select: {
                id: true,
                questionText: true,
                contentId: true,
            },
        });

        return res.status(201).json(question);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create question',
            details: (error as Error).message,
        });
    }
}

// Delete question
export async function deleteQuestionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const questionId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(questionId)) {
            return res.status(400).json({ error: 'Question id must be a number' });
        }

        // Verify teacher owns the course
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: {
                content: {
                    select: {
                        module: {
                            select: {
                                course: {
                                    select: { teacherId: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Admin can delete any question
        if (authReq.user?.role !== 'ADMIN' && question.content.module.course.teacherId !== teacherId) {
            return res.status(403).json({ error: 'You are not the owner of this course' });
        }

        // Delete question (cascading will delete options)
        await prisma.question.delete({
            where: { id: questionId },
        });

        return res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete question',
            details: (error as Error).message,
        });
    }
}

// Create answer option for question
export async function createOptionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { questionId, optionText, isCorrect } = authReq.body ?? {};

        if (!questionId || !optionText || isCorrect === undefined) {
            return res.status(400).json({ error: 'questionId, optionText, and isCorrect are required' });
        }

        const numericQuestionId = Number(questionId);

        if (!Number.isInteger(numericQuestionId)) {
            return res.status(400).json({ error: 'questionId must be an integer' });
        }

        // Verify teacher owns the course
        const question = await prisma.question.findUnique({
            where: { id: numericQuestionId },
            select: {
                content: {
                    select: {
                        module: {
                            select: {
                                course: {
                                    select: { teacherId: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        // Admin can create options for any question
        if (authReq.user?.role !== 'ADMIN' && question.content.module.course.teacherId !== teacherId) {
            return res.status(403).json({ error: 'You are not the owner of this course' });
        }

        // Create option
        const option = await prisma.answerOption.create({
            data: {
                optionText,
                isCorrect: Boolean(isCorrect),
                questionId: numericQuestionId,
            },
            select: {
                id: true,
                optionText: true,
                isCorrect: true,
                questionId: true,
            },
        });

        return res.status(201).json(option);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create option',
            details: (error as Error).message,
        });
    }
}

// Delete answer option
export async function deleteOptionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const optionId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(optionId)) {
            return res.status(400).json({ error: 'Option id must be a number' });
        }

        // Verify teacher owns the course
        const option = await prisma.answerOption.findUnique({
            where: { id: optionId },
            select: {
                question: {
                    select: {
                        content: {
                            select: {
                                module: {
                                    select: {
                                        course: {
                                            select: { teacherId: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!option) {
            return res.status(404).json({ error: 'Option not found' });
        }

        // Admin can delete any option
        if (authReq.user?.role !== 'ADMIN' && option.question.content.module.course.teacherId !== teacherId) {
            return res.status(403).json({ error: 'You are not the owner of this course' });
        }

        // Delete option
        await prisma.answerOption.delete({
            where: { id: optionId },
        });

        return res.status(200).json({ message: 'Option deleted successfully' });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete option',
            details: (error as Error).message,
        });
    }
}

// Get quiz with questions (for teacher)
export async function getQuizQuestionsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'contentId must be a number' });
        }

        // Get quiz with questions
        const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: {
                id: true,
                title: true,
                contentType: true,
                timeLimitInMinutes: true,
                module: {
                    select: {
                        courseId: true,
                        course: {
                            select: { teacherId: true },
                        },
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

        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        if (content.contentType !== ContentType.QUIZ) {
            return res.status(400).json({ error: 'Content is not a quiz' });
        }

        // Admin can view any quiz
        if (authReq.user?.role !== 'ADMIN' && content.module.course.teacherId !== teacherId) {
            return res.status(403).json({ error: 'You are not the owner of this course' });
        }

        const [availableVideoContents, markers] = await Promise.all([
            prisma.content.findMany({
                where: {
                    contentType: ContentType.VIDEO,
                    module: {
                        courseId: content.module.courseId,
                    },
                },
                orderBy: [{ module: { order: 'asc' } }, { order: 'asc' }],
                select: {
                    id: true,
                    title: true,
                    videoUrl: true,
                    durationInSeconds: true,
                    module: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma.videoQuizMarker.findMany({
                where: {
                    question: {
                        contentId,
                    },
                },
                orderBy: [{ timestampSec: 'asc' }, { id: 'asc' }],
                select: {
                    id: true,
                    contentId: true,
                    timestampSec: true,
                    blockingMode: true,
                    questionId: true,
                    content: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
        ]);

        return res.status(200).json({
            ...content,
            availableVideoContents,
            markers: markers.map((marker) => ({
                ...marker,
                blockingMode:
                    String(marker.blockingMode) === 'NON_BLOCKING' || String(marker.blockingMode) === 'non-blocking'
                        ? 'non-blocking'
                        : 'pause',
            })),
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch quiz',
            details: (error as Error).message,
        });
    }
}

