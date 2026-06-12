import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get enrolled students for a course (for teacher)
export async function getEnrolledStudents(courseId: number, teacherId: number) {
    // Verify teacher owns the course
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!course) {
        throw new Error('Course not found');
    }

    if (course.teacherId !== teacherId) {
        throw new Error('You do not have permission to view students for this course');
    }

    const enrollments = await prisma.enrollment.findMany({
        where: {
            courseId,
            student: {
                isPermanentlyDeleted: false,
            },
        },
        include: {
            student: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true,
                    deletedAt: true,
                },
            },
            payment: {
                select: {
                    amount: true,
                    status: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            enrollmentDate: 'desc',
        },
    });

    return enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate,
        progress: enrollment.progress,
        completionDate: enrollment.completionDate,
        student: {
            id: enrollment.student.id,
            username: enrollment.student.username,
            email: enrollment.student.email,
            fullName: [enrollment.student.firstName, enrollment.student.lastName]
                .filter(Boolean)
                .join(' ') || enrollment.student.username,
            joinedAt: enrollment.student.createdAt,
            deletedAt: enrollment.student.deletedAt,
        },
        payment: enrollment.payment
            ? {
                  amount: enrollment.payment.amount,
                  status: enrollment.payment.status,
                  paidAt: enrollment.payment.createdAt,
              }
            : null,
    }));
}

// Get enrollment stats for a course
export async function getEnrollmentStats(courseId: number, teacherId: number) {
    // Verify teacher owns the course
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!course) {
        throw new Error('Course not found');
    }

    if (course.teacherId !== teacherId) {
        throw new Error('You do not have permission to view stats for this course');
    }

    const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: {
            payment: {
                select: {
                    amount: true,
                    status: true,
                },
            },
        },
    });

    const totalStudents = enrollments.length;
    const completedStudents = enrollments.filter((e) => e.completionDate !== null).length;
    const averageProgress =
        totalStudents > 0
            ? enrollments.reduce((sum, e) => sum + e.progress, 0) / totalStudents
            : 0;

    const totalRevenue = enrollments
        .filter((e) => e.payment && e.payment.status === 'SUCCESSFUL')
        .reduce((sum, e) => sum + (e.payment?.amount || 0), 0);

    const freeEnrollments = enrollments.filter((e) => !e.payment || e.payment.amount === 0).length;
    const paidEnrollments = totalStudents - freeEnrollments;

    return {
        totalStudents,
        completedStudents,
        inProgress: totalStudents - completedStudents,
        averageProgress: Math.round(averageProgress * 10) / 10,
        totalRevenue,
        freeEnrollments,
        paidEnrollments,
    };
}

// Get student performance for a course
export async function getStudentPerformance(courseId: number, studentId: number, teacherId: number) {
    // Verify teacher owns the course
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!course) {
        throw new Error('Course not found');
    }

    if (course.teacherId !== teacherId) {
        throw new Error('You do not have permission to view student performance for this course');
    }

    // Verify student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
        where: {
            courseId,
            studentId,
        },
        include: {
            student: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    if (!enrollment) {
        throw new Error('Student is not enrolled in this course');
    }

    // Get course modules and contents
    const courseWithContent = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            modules: {
                include: {
                    contents: {
                        select: {
                            id: true,
                            title: true,
                            contentType: true,
                            order: true,
                        },
                    },
                },
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!courseWithContent) {
        throw new Error('Course content not found');
    }

    // Get completed content IDs - need to join through enrollment
    const enrollmentRecord = await prisma.enrollment.findFirst({
        where: {
            courseId,
            studentId,
        },
        select: {
            id: true,
        },
    });

    if (!enrollmentRecord) {
        throw new Error('Enrollment not found');
    }

    const completedContents = await prisma.contentProgress.findMany({
        where: {
            enrollmentId: enrollmentRecord.id,
        },
        select: {
            contentId: true,
        },
    });

    const completedContentIds = new Set(completedContents.map((c) => c.contentId));

    // Get quiz attempts
    const quizContents = courseWithContent.modules.flatMap((m) =>
        m.contents.filter((c) => c.contentType === 'QUIZ')
    );

    const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
            studentId,
            quizContentId: {
                in: quizContents.map((c) => c.id),
            },
        },
        include: {
            quizContent: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
        orderBy: {
            startTime: 'desc',
        },
    });

    // Calculate content progress
    const totalContents = courseWithContent.modules.reduce((sum, m) => sum + m.contents.length, 0);
    const completedCount = completedContentIds.size;
    const contentProgress = totalContents > 0 ? (completedCount / totalContents) * 100 : 0;

    // Calculate quiz statistics
    const quizStats = quizContents.map((quiz) => {
        const attempts = quizAttempts.filter((a) => a.quizContentId === quiz.id);
        const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;
        const averageScore =
            attempts.length > 0
                ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
                : null;
        const totalAttempts = attempts.length;

        return {
            contentId: quiz.id,
            title: quiz.title,
            attempts: attempts.map((a) => ({
                id: a.id,
                score: a.score,
                createdAt: a.startTime,
            })),
            bestScore,
            averageScore: averageScore ? Math.round(averageScore * 10) / 10 : null,
            totalAttempts,
        };
    });

    return {
        student: {
            id: enrollment.student.id,
            username: enrollment.student.username,
            email: enrollment.student.email,
            fullName: [enrollment.student.firstName, enrollment.student.lastName]
                .filter(Boolean)
                .join(' ') || enrollment.student.username,
        },
        enrollment: {
            enrollmentDate: enrollment.enrollmentDate,
            progress: enrollment.progress,
            completionDate: enrollment.completionDate,
        },
        contentProgress: {
            totalContents,
            completedContents: completedCount,
            progress: Math.round(contentProgress * 10) / 10,
            completedContentIds: Array.from(completedContentIds),
        },
        quizStats,
        modules: courseWithContent.modules.map((module) => ({
            id: module.id,
            title: module.title,
            order: module.order,
            contents: module.contents.map((content) => ({
                id: content.id,
                title: content.title,
                contentType: content.contentType,
                order: content.order,
                isCompleted: completedContentIds.has(content.id),
            })),
        })),
    };
}

