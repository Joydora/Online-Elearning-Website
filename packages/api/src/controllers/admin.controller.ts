import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { parsePagination } from '../lib/validate';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

// ==================== CATEGORY MANAGEMENT ====================

export async function createCategoryController(req: Request, res: Response): Promise<Response> {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check if category already exists
        const existing = await prisma.category.findFirst({
            where: { name: name.trim() },
        });

        if (existing) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        const category = await prisma.category.create({
            data: { name: name.trim() },
        });

        return res.status(201).json(category);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create category',
        });
    }
}

export async function updateCategoryController(req: Request, res: Response): Promise<Response> {
    try {
        const categoryId = Number.parseInt(req.params.id, 10);
        const { name } = req.body;

        if (Number.isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check if category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if new name already exists (excluding current category)
        const existing = await prisma.category.findFirst({
            where: {
                name: name.trim(),
                NOT: { id: categoryId },
            },
        });

        if (existing) {
            return res.status(400).json({ error: 'Category name already exists' });
        }

        const updated = await prisma.category.update({
            where: { id: categoryId },
            data: { name: name.trim() },
        });

        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update category',
        });
    }
}

export async function deleteCategoryController(req: Request, res: Response): Promise<Response> {
    try {
        const categoryId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        // Check if category has courses
        const coursesCount = await prisma.course.count({
            where: { categoryId },
        });

        if (coursesCount > 0) {
            return res.status(400).json({
                error: `Cannot delete category. It has ${coursesCount} course(s) associated with it.`,
            });
        }

        await prisma.category.delete({
            where: { id: categoryId },
        });

        return res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete category',
        });
    }
}

// ==================== USER MANAGEMENT ====================

export async function getAllUsersController(req: Request, res: Response): Promise<Response> {
    try {
        const { role, search } = req.query;

        const where: any = {};

        if (role && typeof role === 'string') {
            where.role = role.toUpperCase() as Role;
        }

        if (search && typeof search === 'string') {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Cap the result size even when the UI doesn't pass limit/offset
        // yet — the admin table currently renders all users, but a
        // malicious/confused caller shouldn't be able to pull the whole
        // user table in one request.
        const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
            defaultLimit: 200,
            maxLimit: 500,
        });

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        coursesAsTeacher: true,
                        enrollments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
        });

        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch users',
        });
    }
}

export async function updateUserRoleController(req: Request, res: Response): Promise<Response> {
    try {
        const userId = Number.parseInt(req.params.id, 10);
        const { role } = req.body;

        if (Number.isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (!role || !Object.values(Role).includes(role)) {
            return res.status(400).json({ error: 'Valid role is required (STUDENT, TEACHER, ADMIN)' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: role as Role },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });

        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update user role',
        });
    }
}

export async function deleteUserController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Prevent deleting self
        if (authReq.user?.userId === userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete user',
        });
    }
}

export async function createUserController(req: Request, res: Response): Promise<Response> {
    try {
        const { username, email, password, role, firstName, lastName } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({
                error: 'Username, email, password, and role are required',
            });
        }

        if (!Object.values(Role).includes(role)) {
            return res.status(400).json({
                error: 'Valid role is required (STUDENT, TEACHER, ADMIN)',
            });
        }

        // Check if username or email already exists
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existing) {
            return res.status(400).json({
                error: existing.username === username ? 'Username already exists' : 'Email already exists',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                hashedPassword,
                role: role as Role,
                firstName: firstName || null,
                lastName: lastName || null,
            },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
            },
        });

        return res.status(201).json(user);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create user',
        });
    }
}

// ==================== COURSE MANAGEMENT (ADMIN) ====================

export async function createCourseAdminController(req: Request, res: Response): Promise<Response> {
    try {
        const { title, description, price, categoryId, teacherId } = req.body;

        if (!title || !description || price === undefined || !categoryId || !teacherId) {
            return res.status(400).json({
                error: 'Title, description, price, categoryId, and teacherId are required',
            });
        }

        // Verify teacher exists and has TEACHER role
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
        });

        if (!teacher || teacher.role !== Role.TEACHER) {
            return res.status(400).json({ error: 'Invalid teacher ID' });
        }

        // Verify category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }

        const course = await prisma.course.create({
            data: {
                title,
                description,
                price: Number(price),
                categoryId,
                teacherId,
            },
            include: {
                category: true,
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return res.status(201).json({ ...course, price: course.price.toNumber() });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to create course',
        });
    }
}

export async function updateCourseAdminController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.id, 10);
        const { title, description, price, categoryId, teacherId } = req.body;

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Invalid course ID' });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Validate updates
        const updateData: any = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = Number(price);

        if (categoryId !== undefined) {
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
            });
            if (!category) {
                return res.status(400).json({ error: 'Invalid category ID' });
            }
            updateData.categoryId = categoryId;
        }

        if (teacherId !== undefined) {
            const teacher = await prisma.user.findUnique({
                where: { id: teacherId },
            });
            if (!teacher || teacher.role !== Role.TEACHER) {
                return res.status(400).json({ error: 'Invalid teacher ID' });
            }
            updateData.teacherId = teacherId;
        }

        const updated = await prisma.course.update({
            where: { id: courseId },
            data: updateData,
            include: {
                category: true,
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return res.status(200).json({ ...updated, price: updated.price.toNumber() });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to update course',
        });
    }
}

export async function getCourseAdminController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Invalid course ID' });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                category: true,
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                modules: {
                    include: {
                        contents: true,
                    },
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: {
                        enrollments: true,
                    },
                },
            },
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        return res.status(200).json({ ...course, price: course.price.toNumber() });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch course',
        });
    }
}

export async function getAllCoursesAdminController(req: Request, res: Response): Promise<Response> {
    try {
        const { search, categoryId } = req.query;

        const where: any = {};

        if (search && typeof search === 'string') {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoryId && typeof categoryId === 'string') {
            where.categoryId = Number.parseInt(categoryId, 10);
        }

        const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
            defaultLimit: 200,
            maxLimit: 500,
        });

        const courses = await prisma.course.findMany({
            where,
            include: {
                category: true,
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
                        modules: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
        });

        return res.status(200).json(
            courses.map((c) => ({ ...c, price: c.price.toNumber() })),
        );
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch courses',
        });
    }
}

export async function deleteCourseAdminController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(courseId)) {
            return res.status(400).json({ error: 'Invalid course ID' });
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check if course has enrollments
        const enrollmentsCount = await prisma.enrollment.count({
            where: { courseId },
        });

        if (enrollmentsCount > 0) {
            return res.status(400).json({
                error: `Cannot delete course. It has ${enrollmentsCount} enrollment(s).`,
                suggestion: 'Consider archiving instead of deleting.',
            });
        }

        await prisma.course.delete({
            where: { id: courseId },
        });

        return res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to delete course',
        });
    }
}

// ==================== ADMIN DASHBOARD STATS ====================

export async function getAdminStatsController(req: Request, res: Response): Promise<Response> {
    try {
        const [totalUsers, totalCourses, totalEnrollments, totalCategories, usersByRole, recentUsers] =
            await Promise.all([
                prisma.user.count(),
                prisma.course.count(),
                prisma.enrollment.count(),
                prisma.category.count(),
                prisma.user.groupBy({
                    by: ['role'],
                    _count: true,
                }),
                prisma.user.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        createdAt: true,
                    },
                }),
            ]);

        const stats = {
            totalUsers,
            totalCourses,
            totalEnrollments,
            totalCategories,
            usersByRole: usersByRole.reduce(
                (acc, item) => {
                    acc[item.role] = item._count;
                    return acc;
                },
                {} as Record<string, number>
            ),
            recentUsers,
        };

        return res.status(200).json(stats);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch admin stats',
        });
    }
}

