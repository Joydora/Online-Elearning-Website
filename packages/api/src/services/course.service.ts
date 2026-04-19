import { ContentType, CourseLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';

const courseSummarySelect = {
    id: true,
    title: true,
    description: true,
    price: true,
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
} as const;

const courseDetailSelect = {
    ...courseSummarySelect,
    prerequisites: {
        select: { id: true, title: true, level: true },
    },
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

// price is DECIMAL(10,2) in the DB — Prisma returns it as Prisma.Decimal,
// which JSON.stringify turns into a string. The frontend is typed as
// `number` and does arithmetic on it, so coerce at the API boundary and
// keep the wire contract stable.
function serialiseCoursePrice<T extends { price: { toNumber(): number } } | null>(
    course: T,
): T extends null ? null : Omit<NonNullable<T>, 'price'> & { price: number } {
    if (!course) return null as never;
    return { ...course, price: course.price.toNumber() } as never;
}

export async function getAllCourses() {
    const rows = await prisma.course.findMany({
        orderBy: { createdAt: 'desc' },
        select: courseSummarySelect,
    });
    return rows.map((c) => serialiseCoursePrice(c));
}

export async function getCourseById(courseId: number) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: courseDetailSelect,
    });
    return serialiseCoursePrice(course);
}

type CreateCourseInput = {
    title: string;
    description: string;
    price: number;
    categoryId: number;
    teacherId: number;
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
    price?: number;
    categoryId?: number;
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
    practiceStarterCode?: string | null;
    practiceExpectedOutput?: string | null;
    practiceLanguage?: string;
    userRole?: string;
};

type UpdateContentInput = {
    contentId: number;
    teacherId: number;
    title?: string;
    order?: number;
    videoUrl?: string | null;
    durationInSeconds?: number | null;
    documentUrl?: string | null;
    fileType?: string | null;
    timeLimitInMinutes?: number | null;
    isFreePreview?: boolean;
    practicePrompt?: string;
    practiceStarterCode?: string | null;
    practiceExpectedOutput?: string | null;
    practiceLanguage?: string;
    userRole?: string;
};

export async function createCourseForTeacher(input: CreateCourseInput) {
    const course = await prisma.course.create({
        data: {
            title: input.title,
            description: input.description,
            price: input.price,
            categoryId: input.categoryId,
            teacherId: input.teacherId,
            trialDurationDays: input.trialDurationDays ?? null,
            accessDurationDays: input.accessDurationDays ?? null,
            level: input.level ?? null,
            prerequisites: input.prerequisiteIds && input.prerequisiteIds.length > 0
                ? { connect: input.prerequisiteIds.map((id) => ({ id })) }
                : undefined,
        },
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
            price: input.price ?? undefined,
            categoryId: input.categoryId ?? undefined,
            trialDurationDays:
                input.trialDurationDays === undefined ? undefined : input.trialDurationDays,
            accessDurationDays:
                input.accessDurationDays === undefined ? undefined : input.accessDurationDays,
            level: input.level === undefined ? undefined : input.level,
            // For prerequisites: replace the full set when caller passes the array.
            prerequisites: input.prerequisiteIds === undefined
                ? undefined
                : { set: input.prerequisiteIds.map((id) => ({ id })) },
        },
    });

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

    // Validate before opening the transaction so we never speculatively
    // write a Content row just to roll it back on a trivial input error.
    if (input.contentType === 'PRACTICE' && !input.practicePrompt?.trim()) {
        throw new Error('PRACTICE_PROMPT_REQUIRED');
    }

    // Content + Practice must land (or not) together. Previously the
    // rollback was a manual follow-up delete, which silently failed on
    // DB hiccups and left orphan Content rows with no Practice sibling.
    return prisma.$transaction(async (tx) => {
        const nextOrder =
            input.order !== undefined
                ? input.order
                : (await tx.content.count({ where: { moduleId: input.moduleId } })) + 1;

        const created = await tx.content.create({
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
            },
        });

        if (input.contentType === 'PRACTICE') {
            await tx.practice.create({
                data: {
                    contentId: created.id,
                    prompt: input.practicePrompt!,
                    starterCode: input.practiceStarterCode ?? null,
                    expectedOutput: input.practiceExpectedOutput ?? null,
                    language: input.practiceLanguage ?? 'plaintext',
                },
            });
        }

        return created;
    });
}

export async function updateContentForTeacher(input: UpdateContentInput) {
    const owningContent = await prisma.content.findUnique({
        where: { id: input.contentId },
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

    if (input.userRole !== 'ADMIN' && owningContent.module.course.teacherId !== input.teacherId) {
        throw new Error('COURSE_FORBIDDEN');
    }

    const updated = await prisma.content.update({
        where: { id: input.contentId },
        data: {
            title: input.title ?? undefined,
            order: input.order ?? undefined,
            videoUrl: input.videoUrl === undefined ? undefined : input.videoUrl,
            durationInSeconds:
                input.durationInSeconds === undefined ? undefined : input.durationInSeconds,
            documentUrl: input.documentUrl === undefined ? undefined : input.documentUrl,
            fileType: input.fileType === undefined ? undefined : input.fileType,
            timeLimitInMinutes:
                input.timeLimitInMinutes === undefined ? undefined : input.timeLimitInMinutes,
            isFreePreview: input.isFreePreview === undefined ? undefined : input.isFreePreview,
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
        },
    });

    // Propagate practice-specific fields if caller sent any — only meaningful
    // for PRACTICE contents, but upsert so a teacher can recover from a
    // PRACTICE row that somehow lost its Practice sibling.
    const touchingPractice =
        input.practicePrompt !== undefined ||
        input.practiceStarterCode !== undefined ||
        input.practiceExpectedOutput !== undefined ||
        input.practiceLanguage !== undefined;

    if (touchingPractice && updated.contentType === 'PRACTICE') {
        await prisma.practice.upsert({
            where: { contentId: updated.id },
            create: {
                contentId: updated.id,
                prompt: input.practicePrompt ?? '',
                starterCode: input.practiceStarterCode ?? null,
                expectedOutput: input.practiceExpectedOutput ?? null,
                language: input.practiceLanguage ?? 'plaintext',
            },
            update: {
                prompt: input.practicePrompt ?? undefined,
                starterCode:
                    input.practiceStarterCode === undefined ? undefined : input.practiceStarterCode,
                expectedOutput:
                    input.practiceExpectedOutput === undefined
                        ? undefined
                        : input.practiceExpectedOutput,
                language: input.practiceLanguage ?? undefined,
            },
        });
    }

    return updated;
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
