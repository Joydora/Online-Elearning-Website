import { ContentType, CourseLevel, CourseStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import { ragService } from './rag.service';

const prisma = new PrismaClient();

type CourseViewer = {
    userId: number;
    role: Role;
};

const courseSummarySelect = {
    id: true,
    title: true,
    description: true,
    syllabus: true,
    price: true,
    thumbnailUrl: true,
    status: true,
    rejectionReason: true,
    trialDurationDays: true,
    accessDurationDays: true,
    level: true,
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
    prerequisites: {
        select: {
            id: true,
            title: true,
            level: true,
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
                    isFreePreview: true,
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
        where: {
            status: CourseStatus.PUBLISHED,
            teacher: {
                deletedAt: null,
                isPermanentlyDeleted: false,
            },
        },
        orderBy: { createdAt: 'desc' },
        select: courseSummarySelect,
    });
}

export async function getCoursesForTeacher(teacherId: number) {
    return prisma.course.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
        select: {
            ...courseSummarySelect,
            modules: {
                select: {
                    _count: {
                        select: {
                            contents: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    enrollments: true,
                    modules: true,
                },
            },
        },
    });
}

export async function getCourseById(courseId: number, viewer?: CourseViewer) {
    const where: Prisma.CourseWhereInput = { id: courseId };

    if (viewer?.role === Role.ADMIN) {
        // Admins can preview all courses from the review/manage screens.
    } else if (viewer?.role === Role.TEACHER) {
        where.OR = [
            { status: CourseStatus.PUBLISHED },
            { teacherId: viewer.userId },
        ];
    } else {
        where.status = CourseStatus.PUBLISHED;
    }

    const course = await prisma.course.findFirst({
        where,
        select: {
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
                            isFreePreview: true,
                            videoUrl: true,
                            documentUrl: true,
                            fileType: true,
                            practice: true,
                        },
                    },
                },
            },
        },
    });

    if (!course) return null;

    const isOwnerOrAdmin =
        viewer?.role === Role.ADMIN ||
        (viewer?.role === Role.TEACHER && course.teacher.id === viewer.userId);

    // If not owner/admin, strip out asset links
    if (!isOwnerOrAdmin) {
        course.modules.forEach((mod) => {
            mod.contents.forEach((cont) => {
                cont.videoUrl = null;
                cont.documentUrl = null;
                cont.fileType = null;
                (cont as any).practice = null;
            });
        });
    }

    return course;
}

export async function getFreePreviewContent(courseId: number, contentId: number) {
    return prisma.content.findFirst({
        where: {
            id: contentId,
            isFreePreview: true,
            module: {
                courseId,
                course: {
                    status: CourseStatus.PUBLISHED,
                },
            },
        },
        select: {
            id: true,
            title: true,
            contentType: true,
            videoUrl: true,
            documentUrl: true,
            durationInSeconds: true,
            fileType: true,
        },
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
    trialDurationDays?: number | null;
    accessDurationDays?: number | null;
    level?: CourseLevel | null;
    prerequisiteIds?: number[];
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
    trialDurationDays?: number | null;
    accessDurationDays?: number | null;
    level?: CourseLevel | null;
    prerequisiteIds?: number[];
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
    isFreePreview?: boolean;
    practicePrompt?: string;
    starterCode?: string | null;
    expectedOutput?: string | null;
    rubric?: string | null;
    language?: string | null;
    userRole?: string;
};

export async function createCourseForTeacher(input: CreateCourseInput) {
    if (input.prerequisiteIds && input.prerequisiteIds.length > 0) {
        const prerequisiteCount = await prisma.course.count({
            where: { id: { in: input.prerequisiteIds } },
        });

        if (prerequisiteCount !== input.prerequisiteIds.length) {
            throw new Error('INVALID_PREREQUISITES');
        }
    }

    const course = await prisma.course.create({
        data: {
            title: input.title,
            description: input.description,
            syllabus: input.syllabus ?? {},
            price: input.price,
            categoryId: input.categoryId,
            teacherId: input.teacherId,
            thumbnailUrl: input.thumbnailUrl || null,
            trialDurationDays: input.trialDurationDays ?? null,
            accessDurationDays: input.accessDurationDays ?? null,
            level: input.level ?? null,
            prerequisites: input.prerequisiteIds && input.prerequisiteIds.length > 0
                ? {
                    connect: input.prerequisiteIds.map((id) => ({ id })),
                }
                : undefined,
        },
    });

    await ragService.reingestCourseSyllabus(course.id).catch((error) => {
        console.error('Unable to ingest course syllabus:', error);
    });

    return getCourseById(course.id, { userId: input.teacherId, role: Role.TEACHER });
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

    if (input.prerequisiteIds !== undefined) {
        if (input.prerequisiteIds.includes(input.courseId)) {
            throw new Error('INVALID_SELF_PREREQUISITE');
        }

        if (input.prerequisiteIds.length > 0) {
            const prerequisiteCount = await prisma.course.count({
                where: {
                    id: { in: input.prerequisiteIds },
                },
            });

            if (prerequisiteCount !== input.prerequisiteIds.length) {
                throw new Error('INVALID_PREREQUISITES');
            }
        }
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
            trialDurationDays: input.trialDurationDays !== undefined ? input.trialDurationDays : undefined,
            accessDurationDays: input.accessDurationDays !== undefined ? input.accessDurationDays : undefined,
            level: input.level !== undefined ? input.level : undefined,
            prerequisites: input.prerequisiteIds !== undefined
                ? {
                    set: input.prerequisiteIds.map((id) => ({ id })),
                }
                : undefined,
        },
    });

    if (input.syllabus !== undefined || input.title !== undefined || input.description !== undefined) {
        await ragService.reingestCourseSyllabus(input.courseId).catch((error) => {
            console.error('Unable to re-ingest course syllabus:', error);
        });
    }

    return getCourseById(input.courseId, {
        userId: input.teacherId,
        role: input.userRole === Role.ADMIN ? Role.ADMIN : Role.TEACHER,
    });
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

    const shouldCreatePractice =
        (input.contentType === ContentType.PRACTICE || input.contentType === ContentType.ASSIGNMENT) &&
        !!input.practicePrompt?.trim();

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
            isFreePreview: input.isFreePreview ?? false,
            moduleId: input.moduleId,
            practice: shouldCreatePractice
                ? {
                    create: {
                        prompt: input.practicePrompt!.trim(),
                        starterCode: input.starterCode ?? null,
                        expectedOutput: input.expectedOutput ?? null,
                        rubric: input.rubric ?? null,
                        language: input.language || 'javascript',
                    },
                }
                : undefined,
        },
        select: {
            id: true,
            title: true,
            order: true,
            contentType: true,
            durationInSeconds: true,
            timeLimitInMinutes: true,
            isFreePreview: true,
            moduleId: true,
            practice: true,
        },
    });
}

export async function updateContentPreviewForTeacher(
    contentId: number,
    teacherId: number,
    isFreePreview: boolean,
    userRole?: string,
) {
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

    if (userRole !== 'ADMIN' && owningContent.module.course.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    return prisma.content.update({
        where: { id: contentId },
        data: { isFreePreview },
        select: {
            id: true,
            title: true,
            order: true,
            contentType: true,
            durationInSeconds: true,
            timeLimitInMinutes: true,
            isFreePreview: true,
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

export async function updateModuleForTeacher(
    moduleId: number,
    teacherId: number,
    title: string,
    userRole?: string
) {
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

    if (userRole !== 'ADMIN' && owningModule.course.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    return prisma.module.update({
        where: { id: moduleId },
        data: { title },
        select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
        },
    });
}

export async function updateContentForTeacher(
    contentId: number,
    teacherId: number,
    input: {
        title: string;
        videoUrl?: string | null;
        durationInSeconds?: number | null;
        documentUrl?: string | null;
        fileType?: string | null;
        timeLimitInMinutes?: number | null;
        isFreePreview?: boolean;
        practicePrompt?: string | null;
        starterCode?: string | null;
        expectedOutput?: string | null;
        rubric?: string | null;
        language?: string | null;
    },
    userRole?: string
) {
    const owningContent = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            contentType: true,
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

    if (userRole !== 'ADMIN' && owningContent.module.course.teacherId !== teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    const isPracticeOrAssignment =
        owningContent.contentType === ContentType.PRACTICE ||
        owningContent.contentType === ContentType.ASSIGNMENT;

    const data: Prisma.ContentUpdateInput = {
        title: input.title,
        videoUrl: input.videoUrl ?? null,
        durationInSeconds: input.durationInSeconds ?? null,
        documentUrl: input.documentUrl ?? null,
        fileType: input.fileType ?? null,
        timeLimitInMinutes: input.timeLimitInMinutes ?? null,
        isFreePreview: input.isFreePreview ?? false,
    };

    if (isPracticeOrAssignment && input.practicePrompt && input.practicePrompt.trim()) {
        data.practice = {
            upsert: {
                create: {
                    prompt: input.practicePrompt.trim(),
                    starterCode: input.starterCode ?? null,
                    expectedOutput: input.expectedOutput ?? null,
                    rubric: input.rubric ?? null,
                    language: input.language || 'javascript',
                },
                update: {
                    prompt: input.practicePrompt.trim(),
                    starterCode: input.starterCode ?? null,
                    expectedOutput: input.expectedOutput ?? null,
                    rubric: input.rubric ?? null,
                    language: input.language || 'javascript',
                },
            },
        };
    }

    return prisma.content.update({
        where: { id: contentId },
        data,
        select: {
            id: true,
            title: true,
            order: true,
            contentType: true,
            durationInSeconds: true,
            timeLimitInMinutes: true,
            isFreePreview: true,
            moduleId: true,
            practice: true,
        },
    });
}

