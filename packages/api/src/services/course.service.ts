import { ContentType, Prisma, PrismaClient } from '@prisma/client';
import { ragService } from './rag.service';

const prisma = new PrismaClient();

const courseSummarySelect = {
    id: true,
    title: true,
    description: true,
    syllabus: true,
    price: true,
    thumbnailUrl: true,
    createdAt: true,
    updatedAt: true,
    category: {
        select: {
            id: true,
            name: true,
        },
    },
    teacher: {
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
        },
    },
    _count: {
        select: {
            enrollments: true,
        },
    },
} as const;

const courseDetailSelect = {
    ...courseSummarySelect,
    modules: {
        orderBy: { order: 'asc' },
        select: {
            id: true,
            title: true,
            order: true,
            contents: {
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    title: true,
                    order: true,
                    contentType: true,
                    durationInSeconds: true,
                    timeLimitInMinutes: true,
                    // Intentionally omit video/document URLs to keep asset links hidden
                },
            },
        },
    },
} as const;

export async function getAllCategories() {
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
        },
    });
}

export async function getAllCourses() {
    return prisma.course.findMany({
        orderBy: { createdAt: 'desc' },
        select: courseSummarySelect,
    });
}

export async function getCourseById(courseId: number) {
    return prisma.course.findUnique({
        where: { id: courseId },
        select: courseDetailSelect,
    });
}

type CreateCourseInput = {
    title: string;
    description: string;
    syllabus?: Prisma.InputJsonValue;
    price: number;
    categoryId: number;
    teacherId: number;
    thumbnailUrl?: string;
};

type UpdateCourseInput = {
    courseId: number;
    teacherId: number;
    title?: string;
    description?: string;
    syllabus?: Prisma.InputJsonValue;
    price?: number;
    categoryId?: number;
    thumbnailUrl?: string;
    userRole?: string;
};

type CreateModuleInput = {
    courseId: number;
    teacherId: number;
    title: string;
    order?: number;
    userRole?: string;
};

type CreateContentInput = {
    moduleId: number;
    teacherId: number;
    title: string;
    order?: number;
    contentType: ContentType;
    videoUrl?: string | null;
    durationInSeconds?: number | null;
    documentUrl?: string | null;
    fileType?: string | null;
    timeLimitInMinutes?: number | null;
    userRole?: string;
};

export async function createCourseForTeacher(input: CreateCourseInput) {
    const course = await prisma.course.create({
        data: {
            title: input.title,
            description: input.description,
            syllabus: input.syllabus ?? {},
            price: input.price,
            categoryId: input.categoryId,
            teacherId: input.teacherId,
            thumbnailUrl: input.thumbnailUrl || null,
        },
    });

    await ragService.reingestCourseSyllabus(course.id).catch((error) => {
        console.error('Unable to ingest course syllabus:', error);
    });

    return getCourseById(course.id);
}

export async function updateCourseForTeacher(input: UpdateCourseInput) {
    const owningCourse = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { teacherId: true },
    });

    if (!owningCourse) {
        throw new Error('COURSE_NOT_FOUND');
    }

    // Admin can update any course
    if (input.userRole !== 'ADMIN' && owningCourse.teacherId !== input.teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    await prisma.course.update({
        where: { id: input.courseId },
        data: {
            title: input.title ?? undefined,
            description: input.description ?? undefined,
            syllabus: input.syllabus !== undefined ? input.syllabus : undefined,
            price: input.price ?? undefined,
            categoryId: input.categoryId ?? undefined,
            thumbnailUrl: input.thumbnailUrl !== undefined ? (input.thumbnailUrl || null) : undefined,
        },
    });

    if (input.syllabus !== undefined || input.title !== undefined || input.description !== undefined) {
        await ragService.reingestCourseSyllabus(input.courseId).catch((error) => {
            console.error('Unable to re-ingest course syllabus:', error);
        });
    }

    return getCourseById(input.courseId);
}

export async function deleteCourseForTeacher(courseId: number, teacherId: number, userRole?: string) {
    const owningCourse = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!owningCourse) {
        throw new Error('COURSE_NOT_FOUND');
    }

    // Admin can delete any course
    if (userRole !== 'ADMIN' && owningCourse.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    // Delete course (cascading deletes will handle modules, contents, etc.)
    await prisma.course.delete({
        where: { id: courseId },
    });

    return { success: true };
}

export async function createModuleForCourse(input: CreateModuleInput) {
    const owningCourse = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { teacherId: true },
    });

    if (!owningCourse) {
        throw new Error('COURSE_NOT_FOUND');
    }

    // Admin can create modules for any course
    if (input.userRole !== 'ADMIN' && owningCourse.teacherId !== input.teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    const nextOrder =
        input.order !== undefined
            ? input.order
            : (await prisma.module.count({ where: { courseId: input.courseId } })) + 1;

    return prisma.module.create({
        data: {
            title: input.title,
            order: nextOrder,
            courseId: input.courseId,
        },
        select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
        },
    });
}

export async function deleteModuleForTeacher(moduleId: number, teacherId: number, userRole?: string) {
    const owningModule = await prisma.module.findUnique({
        where: { id: moduleId },
        select: {
            course: {
                select: { teacherId: true },
            },
        },
    });

    if (!owningModule) {
        throw new Error('MODULE_NOT_FOUND');
    }

    // Admin can delete any module
    if (userRole !== 'ADMIN' && owningModule.course.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    // Delete module (cascading deletes will handle contents)
    await prisma.module.delete({
        where: { id: moduleId },
    });

    return { success: true };
}

export async function createContentForModule(input: CreateContentInput) {
    const owningModule = await prisma.module.findUnique({
        where: { id: input.moduleId },
        select: {
            course: {
                select: { teacherId: true },
            },
        },
    });

    if (!owningModule) {
        throw new Error('MODULE_NOT_FOUND');
    }

    // Admin can create content for any module
    if (input.userRole !== 'ADMIN' && owningModule.course.teacherId !== input.teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    const nextOrder =
        input.order !== undefined
            ? input.order
            : (await prisma.content.count({ where: { moduleId: input.moduleId } })) + 1;

    return prisma.content.create({
        data: {
            title: input.title,
            order: nextOrder,
            contentType: input.contentType,
            videoUrl: input.videoUrl ?? null,
            durationInSeconds: input.durationInSeconds ?? null,
            documentUrl: input.documentUrl ?? null,
            fileType: input.fileType ?? null,
            timeLimitInMinutes: input.timeLimitInMinutes ?? null,
            moduleId: input.moduleId,
        },
        select: {
            id: true,
            title: true,
            order: true,
            contentType: true,
            durationInSeconds: true,
            timeLimitInMinutes: true,
            moduleId: true,
        },
    });
}

export async function deleteContentForTeacher(contentId: number, teacherId: number, userRole?: string) {
    const owningContent = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            module: {
                select: {
                    course: {
                        select: { teacherId: true },
                    },
                },
            },
        },
    });

    if (!owningContent) {
        throw new Error('CONTENT_NOT_FOUND');
    }

    // Admin can delete any content
    if (userRole !== 'ADMIN' && owningContent.module.course.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    // Delete content
    await prisma.content.delete({
        where: { id: contentId },
    });

    return { success: true };
}
