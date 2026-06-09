import { Request, Response } from 'express';
import { ContentType, CourseLevel, Role } from '@prisma/client';
import {
    createContentForModule,
    createCourseForTeacher,
    createModuleForCourse,
    deleteContentForTeacher,
    deleteCourseForTeacher,
    deleteModuleForTeacher,
    getAllCategories,
    getAllCourses,
    getCourseById,
    getCoursesForTeacher,
    getFreePreviewContent,
    updateContentPreviewForTeacher,
    updateCourseForTeacher,
    updateModuleForTeacher,
    updateContentForTeacher,
} from '../services/course.service';
import { submitForReview } from '../services/courseReview.service';
import { AuthenticatedUser } from '../types/auth';

export async function getCategoriesController(_req: Request, res: Response): Promise<Response> {
    try {
        const categories = await getAllCategories();
        return res.status(200).json(categories);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch categories',
            details: (error as Error).message,
        });
    }
}

export async function getCoursesController(_req: Request, res: Response): Promise<Response> {
    try {
        const courses = await getAllCourses();
        return res.status(200).json(courses);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch courses',
            details: (error as Error).message,
        });
    }
}

export async function getCourseDetailController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const idParam = req.params.id;
        const courseId = Number.parseInt(idParam, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        const course = await getCourseById(courseId, authReq.user);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        return res.status(200).json(course);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch course detail',
            details: (error as Error).message,
        });
    }
}

export async function getFreePreviewContentController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.courseId, 10);
        const contentId = Number.parseInt(req.params.contentId, 10);

        if (Number.isNaN(courseId) || Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'courseId and contentId must be numbers' });
        }

        const content = await getFreePreviewContent(courseId, contentId);

        if (!content) {
            return res.status(404).json({ error: 'Free preview content not found' });
        }

        return res.status(200).json(content);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch free preview content',
            details: (error as Error).message,
        });
    }
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

export async function getMyCoursesController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;

        if (!authReq.user || authReq.user.role !== Role.TEACHER) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const courses = await getCoursesForTeacher(authReq.user.userId);
        return res.status(200).json(courses);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch teacher courses',
            details: (error as Error).message,
        });
    }
}

function getTeacherId(req: AuthenticatedRequest): number | null {
    // Allow both TEACHER and ADMIN to manage courses
    if (!req.user || (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN)) {
        return null;
    }
    return req.user.userId;
}

function normalizeSyllabus(value: unknown) {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return {};
        }

        try {
            return JSON.parse(trimmed);
        } catch (error) {
            return { outline: trimmed };
        }
    }

    return value ?? {};
}

function parseOptionalPositiveInt(value: unknown, fieldName: string): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${fieldName} must be a positive integer when provided`);
    }

    return parsed;
}

function parseOptionalCourseLevel(value: unknown): CourseLevel | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string') {
        throw new Error('level must be BEGINNER, INTERMEDIATE, or ADVANCED');
    }
    const allowed: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    if (!allowed.includes(value as CourseLevel)) {
        throw new Error('level must be BEGINNER, INTERMEDIATE, or ADVANCED');
    }
    return value as CourseLevel;
}

function parseOptionalPrerequisiteIds(value: unknown): number[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) {
        throw new Error('prerequisiteIds must be an array of course ids');
    }

    const parsedIds = value.map((item) => Number(item));
    if (parsedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new Error('prerequisiteIds must contain positive integer ids');
    }

    return Array.from(new Set(parsedIds));
}

export async function createCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { title, description, price, categoryId, thumbnailUrl, syllabus, trialDurationDays, accessDurationDays, level, prerequisiteIds } = authReq.body ?? {};

        if (!title || !description || price === undefined || categoryId === undefined) {
            return res.status(400).json({
                error: 'Title, description, price, and categoryId are required',
            });
        }

        const numericPrice = Number(price);
        const numericCategoryId = Number(categoryId);

        if (Number.isNaN(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ error: 'Price must be a non-negative number' });
        }

        if (!Number.isInteger(numericCategoryId)) {
            return res.status(400).json({ error: 'categoryId must be an integer' });
        }

        let parsedTrialDurationDays: number | null | undefined;
        let parsedAccessDurationDays: number | null | undefined;
        let parsedLevel: CourseLevel | null | undefined;
        let parsedPrerequisiteIds: number[] | undefined;

        try {
            parsedTrialDurationDays = parseOptionalPositiveInt(trialDurationDays, 'trialDurationDays');
            parsedAccessDurationDays = parseOptionalPositiveInt(accessDurationDays, 'accessDurationDays');
            parsedLevel = parseOptionalCourseLevel(level);
            parsedPrerequisiteIds = parseOptionalPrerequisiteIds(prerequisiteIds);
        } catch (error) {
            return res.status(400).json({ error: (error as Error).message });
        }

        let course;
        try {
            course = await createCourseForTeacher({
                title,
                description,
                syllabus: normalizeSyllabus(syllabus),
                price: numericPrice,
                categoryId: numericCategoryId,
                teacherId,
                thumbnailUrl,
                trialDurationDays: parsedTrialDurationDays,
                accessDurationDays: parsedAccessDurationDays,
                level: parsedLevel,
                prerequisiteIds: parsedPrerequisiteIds,
            });
        } catch (error) {
            if ((error as Error).message === 'INVALID_PREREQUISITES') {
                return res.status(400).json({ error: 'Some prerequisite course ids are invalid' });
            }
            throw error;
        }

        if (!course) {
            return res.status(500).json({ error: 'Course creation failed' });
        }

        return res.status(201).json(course);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create course',
            details: (error as Error).message,
        });
    }
}

export async function updateCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        const { title, description, price, categoryId, thumbnailUrl, syllabus, trialDurationDays, accessDurationDays, level, prerequisiteIds } = authReq.body ?? {};

        if (
            title === undefined &&
            description === undefined &&
            price === undefined &&
            categoryId === undefined &&
            thumbnailUrl === undefined &&
            syllabus === undefined &&
            trialDurationDays === undefined &&
            accessDurationDays === undefined &&
            level === undefined &&
            prerequisiteIds === undefined
        ) {
            return res.status(400).json({ error: 'No fields provided for update' });
        }

        const numericPrice =
            price !== undefined ? Number(price) : undefined;
        const numericCategoryId =
            categoryId !== undefined ? Number(categoryId) : undefined;

        if (numericPrice !== undefined && (Number.isNaN(numericPrice) || numericPrice < 0)) {
            return res.status(400).json({ error: 'Price must be a non-negative number' });
        }

        if (numericCategoryId !== undefined && !Number.isInteger(numericCategoryId)) {
            return res.status(400).json({ error: 'categoryId must be an integer' });
        }

        let parsedTrialDurationDays: number | null | undefined;
        let parsedAccessDurationDays: number | null | undefined;
        let parsedLevel: CourseLevel | null | undefined;
        let parsedPrerequisiteIds: number[] | undefined;

        try {
            parsedTrialDurationDays = parseOptionalPositiveInt(trialDurationDays, 'trialDurationDays');
            parsedAccessDurationDays = parseOptionalPositiveInt(accessDurationDays, 'accessDurationDays');
            parsedLevel = parseOptionalCourseLevel(level);
            parsedPrerequisiteIds = parseOptionalPrerequisiteIds(prerequisiteIds);
        } catch (error) {
            return res.status(400).json({ error: (error as Error).message });
        }

        try {
            const updatedCourse = await updateCourseForTeacher({
                courseId,
                teacherId,
                title,
                description,
                syllabus: normalizeSyllabus(syllabus),
                price: numericPrice,
                categoryId: numericCategoryId,
                thumbnailUrl,
                trialDurationDays: parsedTrialDurationDays,
                accessDurationDays: parsedAccessDurationDays,
                level: parsedLevel,
                prerequisiteIds: parsedPrerequisiteIds,
                userRole: authReq.user?.role,
            });

            if (!updatedCourse) {
                return res.status(500).json({ error: 'Course update failed' });
            }

            return res.status(200).json(updatedCourse);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Course not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            if (message === 'INVALID_PREREQUISITES') {
                return res.status(400).json({ error: 'Some prerequisite course ids are invalid' });
            }

            if (message === 'INVALID_SELF_PREREQUISITE') {
                return res.status(400).json({ error: 'A course cannot be a prerequisite of itself' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update course',
            details: (error as Error).message,
        });
    }
}

export async function deleteCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        try {
            await deleteCourseForTeacher(courseId, teacherId, authReq.user?.role);
            return res.status(200).json({ message: 'Course deleted successfully' });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Course not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete course',
            details: (error as Error).message,
        });
    }
}

export async function createModuleController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { courseId, title, order } = authReq.body ?? {};

        if (!courseId || !title) {
            return res.status(400).json({ error: 'courseId and title are required' });
        }

        const numericCourseId = Number(courseId);

        if (!Number.isInteger(numericCourseId)) {
            return res.status(400).json({ error: 'courseId must be an integer' });
        }

        const numericOrder = order !== undefined ? Number(order) : undefined;

        if (numericOrder !== undefined && !Number.isInteger(numericOrder)) {
            return res.status(400).json({ error: 'order must be an integer when provided' });
        }

        try {
            const module = await createModuleForCourse({
                courseId: numericCourseId,
                teacherId,
                title,
                order: numericOrder,
                userRole: authReq.user?.role,
            });

            return res.status(201).json(module);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'COURSE_NOT_FOUND') {
                return res.status(404).json({ error: 'Course not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create module',
            details: (error as Error).message,
        });
    }
}

export async function createContentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const {
            moduleId,
            title,
            order,
            contentType,
            videoUrl,
            durationInSeconds,
            documentUrl,
            fileType,
            timeLimitInMinutes,
            isFreePreview,
            practicePrompt,
            starterCode,
            expectedOutput,
            rubric,
            language,
        } = authReq.body ?? {};

        if (!moduleId || !title || !contentType) {
            return res.status(400).json({ error: 'moduleId, title, and contentType are required' });
        }

        const numericModuleId = Number(moduleId);

        if (!Number.isInteger(numericModuleId)) {
            return res.status(400).json({ error: 'moduleId must be an integer' });
        }

        if (!Object.values(ContentType).includes(contentType as ContentType)) {
            return res.status(400).json({ error: 'contentType is invalid' });
        }

        const numericOrder = order !== undefined ? Number(order) : undefined;

        if (numericOrder !== undefined && !Number.isInteger(numericOrder)) {
            return res.status(400).json({ error: 'order must be an integer when provided' });
        }

        const numericDuration =
            durationInSeconds !== undefined ? Number(durationInSeconds) : undefined;

        if (numericDuration !== undefined && Number.isNaN(numericDuration)) {
            return res.status(400).json({ error: 'durationInSeconds must be a number when provided' });
        }

        const numericTimeLimit =
            timeLimitInMinutes !== undefined ? Number(timeLimitInMinutes) : undefined;

        if (numericTimeLimit !== undefined && Number.isNaN(numericTimeLimit)) {
            return res.status(400).json({ error: 'timeLimitInMinutes must be a number when provided' });
        }

        if (
            (contentType === ContentType.PRACTICE || contentType === ContentType.ASSIGNMENT) &&
            (!practicePrompt || typeof practicePrompt !== 'string')
        ) {
            return res.status(400).json({ error: 'practicePrompt is required for practice or assignment content' });
        }

        try {
            const content = await createContentForModule({
                moduleId: numericModuleId,
                teacherId,
                title,
                order: numericOrder,
                contentType: contentType as ContentType,
                videoUrl,
                durationInSeconds: numericDuration,
                documentUrl,
                fileType,
                timeLimitInMinutes: numericTimeLimit,
                isFreePreview: Boolean(isFreePreview),
                practicePrompt,
                starterCode,
                expectedOutput,
                rubric,
                language,
                userRole: authReq.user?.role,
            });

            return res.status(201).json(content);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'MODULE_NOT_FOUND') {
                return res.status(404).json({ error: 'Module not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create content',
            details: (error as Error).message,
        });
    }
}

export async function updateContentPreviewController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const contentId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'Content id must be a number' });
        }

        if (typeof authReq.body?.isFreePreview !== 'boolean') {
            return res.status(400).json({ error: 'isFreePreview must be a boolean' });
        }

        try {
            const content = await updateContentPreviewForTeacher(
                contentId,
                teacherId,
                authReq.body.isFreePreview,
                authReq.user?.role,
            );

            return res.status(200).json(content);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'CONTENT_NOT_FOUND') {
                return res.status(404).json({ error: 'Content not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update content preview setting',
            details: (error as Error).message,
        });
    }
}

export async function deleteModuleController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const moduleId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(moduleId)) {
            return res.status(400).json({ error: 'Module id must be a number' });
        }

        try {
            await deleteModuleForTeacher(moduleId, teacherId, authReq.user?.role);
            return res.status(200).json({ message: 'Module deleted successfully' });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'MODULE_NOT_FOUND') {
                return res.status(404).json({ error: 'Module not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete module',
            details: (error as Error).message,
        });
    }
}

// EPIC 2: Submit course for admin review
export async function submitForReviewController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        try {
            const updated = await submitForReview(courseId, teacherId);
            return res.status(200).json(updated);
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            if (message === 'INVALID_STATUS') {
                return res.status(400).json({
                    error: 'Course can only be submitted from DRAFT or REJECTED status',
                });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to submit course for review',
            details: (error as Error).message,
        });
    }
}

export async function deleteContentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const contentId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'Content id must be a number' });
        }

        try {
            await deleteContentForTeacher(contentId, teacherId, authReq.user?.role);
            return res.status(200).json({ message: 'Content deleted successfully' });
        } catch (error) {
            const message = (error as Error).message;

            if (message === 'CONTENT_NOT_FOUND') {
                return res.status(404).json({ error: 'Content not found' });
            }

            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete content',
            details: (error as Error).message,
        });
    }
}

export async function updateModuleController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const moduleId = Number.parseInt(req.params.id, 10);
        const { title } = authReq.body ?? {};

        if (Number.isNaN(moduleId)) {
            return res.status(400).json({ error: 'Module id must be a number' });
        }

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        try {
            const updated = await updateModuleForTeacher(
                moduleId,
                teacherId,
                title.trim(),
                authReq.user?.role
            );
            return res.status(200).json(updated);
        } catch (error) {
            const message = (error as Error).message;
            if (message === 'MODULE_NOT_FOUND') {
                return res.status(404).json({ error: 'Module not found' });
            }
            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update module',
            details: (error as Error).message,
        });
    }
}

export async function updateContentController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const contentId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'Content id must be a number' });
        }

        const {
            title,
            videoUrl,
            durationInSeconds,
            documentUrl,
            fileType,
            timeLimitInMinutes,
            isFreePreview,
            practicePrompt,
            starterCode,
            expectedOutput,
            rubric,
            language,
        } = authReq.body ?? {};

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const numericDuration =
            durationInSeconds !== undefined && durationInSeconds !== null && durationInSeconds !== ''
                ? Number(durationInSeconds)
                : undefined;

        const numericTimeLimit =
            timeLimitInMinutes !== undefined && timeLimitInMinutes !== null && timeLimitInMinutes !== ''
                ? Number(timeLimitInMinutes)
                : undefined;

        try {
            const updated = await updateContentForTeacher(
                contentId,
                teacherId,
                {
                    title: title.trim(),
                    videoUrl,
                    durationInSeconds: numericDuration,
                    documentUrl,
                    fileType,
                    timeLimitInMinutes: numericTimeLimit,
                    isFreePreview: isFreePreview !== undefined ? Boolean(isFreePreview) : undefined,
                    practicePrompt,
                    starterCode,
                    expectedOutput,
                    rubric,
                    language,
                },
                authReq.user?.role
            );
            return res.status(200).json(updated);
        } catch (error) {
            const message = (error as Error).message;
            if (message === 'CONTENT_NOT_FOUND') {
                return res.status(404).json({ error: 'Content not found' });
            }
            if (message === 'COURSE_FORBIDDEN') {
                return res.status(403).json({ error: 'You are not the owner of this course' });
            }
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update content',
            details: (error as Error).message,
        });
    }
}
