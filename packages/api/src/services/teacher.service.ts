import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getTeacherProfile(teacherId: number) {
    const teacher = await prisma.user.findUnique({
        where: { 
            id: teacherId,
            role: 'TEACHER',
        },
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
            coursesAsTeacher: {
                where: { status: 'PUBLISHED' },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    price: true,
                    thumbnailUrl: true,
                    createdAt: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            enrollments: true,
                            modules: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    });

    if (!teacher) {
        return null;
    }

    // Calculate total students
    const totalStudents = teacher.coursesAsTeacher.reduce(
        (sum, course) => sum + course._count.enrollments,
        0
    );

    // Calculate total courses
    const totalCourses = teacher.coursesAsTeacher.length;

    return {
        id: teacher.id,
        username: teacher.username,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        fullName: [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.username,
        email: teacher.email,
        joinedAt: teacher.createdAt,
        stats: {
            totalCourses,
            totalStudents,
        },
        courses: teacher.coursesAsTeacher.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            price: course.price,
            thumbnailUrl: course.thumbnailUrl,
            createdAt: course.createdAt,
            category: course.category,
            totalStudents: course._count.enrollments,
            totalModules: course._count.modules,
        })),
    };
}

export async function getAllTeachers() {
    const teachers = await prisma.user.findMany({
        where: {
            role: 'TEACHER',
        },
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            coursesAsTeacher: {
                where: { status: 'PUBLISHED' },
                select: {
                    _count: {
                        select: {
                            enrollments: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return teachers.map(teacher => {
        const totalStudents = teacher.coursesAsTeacher.reduce(
            (sum, course) => sum + course._count.enrollments,
            0
        );

        return {
            id: teacher.id,
            username: teacher.username,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            fullName: [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.username,
            joinedAt: teacher.createdAt,
            totalCourses: teacher.coursesAsTeacher.length,
            totalStudents,
        };
    });
}

