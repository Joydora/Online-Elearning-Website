import { Request, Response } from 'express';
import { ContentType, Role } from '@prisma/client';
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
    updateContentForTeacher,
    updateCourseForTeacher,
} from '../services/course.service';
import { AuthenticatedUser } from '../types/auth';
import { getContentWithAccess } from '../services/contentAccess.service';

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
        const idParam = req.params.id;
        const courseId = Number.parseInt(idParam, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Course id must be a number' });
        }

        const course = await getCourseById(courseId);

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

export async function getContentController(req: Request, res: Response): Promise<Response> {
    try {
        const contentId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(contentId)) {
            return res.status(400).json({ error: 'Content id must be a number' });
        }

        const authReq = req as Request & { user?: AuthenticatedUser };
        const userId = authReq.user?.userId ?? null;

        const { decision, content } = await getContentWithAccess(userId, contentId);

        if (decision.reason === 'CONTENT_NOT_FOUND') {
            return res.status(404).json({ error: 'Content not found' });
        }

        if (!decision.allowed) {
            return res.status(403).json({
                error: 'Access denied',
                reason: decision.reason,
            });
        }

        return res.status(200).json({
            ...content,
            accessReason: decision.reason,
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch content',
            details: (error as Error).message,
        });
    }
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

function getTeacherId(req: AuthenticatedRequest): number | null {
    // Allow both TEACHER and ADMIN to manage courses
    if (!req.user || (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN)) {
        return null;
    }
    return req.user.userId;
}

export async function createCourseController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const teacherId = getTeacherId(authReq);

        if (!teacherId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { title, description, price, categoryId, trialDurationDays, accessDurationDays } = authReq.body ?? {};

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

        let normalizedTrialDays: number | null | undefined;
        if (trialDurationDays === undefined || trialDurationDays === null || trialDurationDays === '') {
            normalizedTrialDays = null;
        } else {
            const n = Number(trialDurationDays);
            if (!Number.isInteger(n) || n <= 0) {
                return res.status(400).json({
                    error: 'trialDurationDays must be a positive integer when provided',
                });
            }
            normalizedTrialDays = n;
        }

        let normalizedAccessDays: number | null | undefined;
        if (accessDurationDays === undefined || accessDurationDays === null || accessDurationDays === '') {
            normalizedAccessDays = null;
        } else {
            const n = Number(accessDurationDays);
            if (!Number.isInteger(n) || n <= 0) {
                return res.status(400).json({
                    error: 'accessDurationDays must be a positive integer when provided',
                });
            }
            normalizedAccessDays = n;
        }

        const course = await createCourseForTeacher({
            title,
            description,
            price: numericPrice,
            categoryId: numericCategoryId,
            teacherId,
            trialDurationDays: normalizedTrialDays,
            accessDurationDays: normalizedAccessDays,
        });

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

        const { title, description, price, categoryId, trialDurationDays, accessDurationDays } = authReq.body ?? {};

        if (
            title === undefined &&
            description === undefined &&
            price === undefined &&
            categoryId === undefined &&
            trialDurationDays === undefined &&
            accessDurationDays === undefined
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

        let normalizedTrialDays: number | null | undefined = undefined;
        if (trialDurationDays !== undefined) {
            if (trialDurationDays === null || trialDurationDays === '') {
                normalizedTrialDays = null;
            } else {
                const n = Number(trialDurationDays);
                if (!Number.isInteger(n) || n <= 0) {
                    return res.status(400).json({
                        error: 'trialDurationDays must be a positive integer or null',
                    });
                }
                normalizedTrialDays = n;
            }
        }

        let normalizedAccessDays: number | null | undefined = undefined;
        if (accessDurationDays !== undefined) {
            if (accessDurationDays === null || accessDurationDays === '') {
                normalizedAccessDays = null;
            } else {
                const n = Number(accessDurationDays);
                if (!Number.isInteger(n) || n <= 0) {
                    return res.status(400).json({
                        error: 'accessDurationDays must be a positive integer or null',
                    });
                }
                normalizedAccessDays = n;
            }
        }

        try {
            const updatedCourse = await updateCourseForTeacher({
                courseId,
                teacherId,
                title,
                description,
                price: numericPrice,
                categoryId: numericCategoryId,
                trialDurationDays: normalizedTrialDays,
                accessDurationDays: normalizedAccessDays,
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
                isFreePreview: typeof isFreePreview === 'boolean' ? isFreePreview : undefined,
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
            order,
            videoUrl,
            durationInSeconds,
            documentUrl,
            fileType,
            timeLimitInMinutes,
            isFreePreview,
        } = authReq.body ?? {};

        if (
            title === undefined &&
            order === undefined &&
            videoUrl === undefined &&
            durationInSeconds === undefined &&
            documentUrl === undefined &&
            fileType === undefined &&
            timeLimitInMinutes === undefined &&
            isFreePreview === undefined
        ) {
            return res.status(400).json({ error: 'No fields provided for update' });
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

        if (isFreePreview !== undefined && typeof isFreePreview !== 'boolean') {
            return res.status(400).json({ error: 'isFreePreview must be a boolean' });
        }

        try {
            const content = await updateContentForTeacher({
                contentId,
                teacherId,
                title,
                order: numericOrder,
                videoUrl,
                durationInSeconds: numericDuration,
                documentUrl,
                fileType,
                timeLimitInMinutes: numericTimeLimit,
                isFreePreview,
                userRole: authReq.user?.role,
            });

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
            error: 'Unable to update content',
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
