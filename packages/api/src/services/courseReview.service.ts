import { PrismaClient, CourseStatus } from '@prisma/client';
import { sendRejectionEmail } from './email.service';

const prisma = new PrismaClient();

export async function submitForReview(courseId: number, teacherId: number) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== teacherId) throw new Error('FORBIDDEN');
    if (course.status !== 'DRAFT' && course.status !== 'REJECTED') throw new Error('INVALID_STATUS');

    return prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.PENDING_REVIEW, submittedAt: new Date() },
    });
}

export async function approveCourse(courseId: number, adminId: number) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error('NOT_FOUND');

    return prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.PUBLISHED, reviewedById: adminId, rejectionReason: null },
    });
}

export async function rejectCourse(courseId: number, adminId: number, reason: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { teacher: { select: { email: true, username: true } } },
    });
    if (!course) throw new Error('NOT_FOUND');

    const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.REJECTED, reviewedById: adminId, rejectionReason: reason },
    });

    // Notify teacher by email (non-blocking)
    sendRejectionEmail(course.teacher.email, course.teacher.username, course.title, reason).catch(() => {});

    return updated;
}

export async function getPendingCourses() {
    return prisma.course.findMany({
        where: { status: CourseStatus.PENDING_REVIEW },
        include: {
            teacher: { select: { id: true, username: true, firstName: true, lastName: true, email: true } },
            category: { select: { name: true } },
            _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { submittedAt: 'asc' },
    });
}

export async function getAllCoursesForAdmin() {
    return prisma.course.findMany({
        include: {
            teacher: { select: { id: true, username: true, firstName: true, lastName: true } },
            category: { select: { name: true } },
            _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}
