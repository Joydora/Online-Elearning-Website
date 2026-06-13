import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

export type UpdateProfileInput = {
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
};

// Get user profile
export async function getUserProfile(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            isVerified: true,
            referralCode: true,
            _count: {
                select: {
                    enrollments: true,
                    coursesAsTeacher: true,
                    quizAttempts: true,
                },
            },
            // For teachers, get courses with enrollment counts to calculate total students
            coursesAsTeacher: {
                select: {
                    _count: {
                        select: {
                            enrollments: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    let referralCode = user.referralCode;
    if (!referralCode) {
        const sanitizedUsername = user.username.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        referralCode = `REF-${sanitizedUsername}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        await prisma.user.update({
            where: { id: userId },
            data: { referralCode },
        });
    }

    // Calculate total students for teachers (sum of enrollments in all their courses)
    let totalStudents = 0;
    if (user.role === 'TEACHER' && user.coursesAsTeacher) {
        totalStudents = user.coursesAsTeacher.reduce(
            (sum, course) => sum + course._count.enrollments,
            0
        );
    }

    return {
        ...user,
        referralCode,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
        totalStudents, // Add total students for teachers
    };
}

// Update user profile
export async function updateUserProfile(userId: number, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error('User not found');
    }

    const updateData: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string;
        username?: string;
        hashedPassword?: string;
    } = {};

    // Update basic info
    if (input.firstName !== undefined) {
        updateData.firstName = input.firstName || null;
    }
    if (input.lastName !== undefined) {
        updateData.lastName = input.lastName || null;
    }

    // Update email (check if already exists)
    if (input.email && input.email !== user.email) {
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email },
        });

        if (existingUser) {
            throw new Error('Email already in use');
        }

        // If email changed, mark as unverified
        updateData.email = input.email;
        // Note: In a real app, you might want to send verification email again
    }

    // Username cannot be changed
    if (input.username && input.username !== user.username) {
        throw new Error('Username cannot be changed');
    }

    // Update password (requires current password)
    if (input.newPassword) {
        if (!input.currentPassword) {
            throw new Error('Current password is required to change password');
        }

        const isPasswordValid = await bcrypt.compare(input.currentPassword, user.hashedPassword);

        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        if (input.newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        updateData.hashedPassword = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            isVerified: true,
        },
    });

    return {
        ...updatedUser,
        fullName: [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(' ') || updatedUser.username,
    };
}

