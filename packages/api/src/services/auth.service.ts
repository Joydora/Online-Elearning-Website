import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    return secret;
}

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

export type RegisterInput = {
    email: string;
    username: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: Role;
};

export type LoginResult = {
    token: string;
    user: SafeUser;
};

export type SafeUser = Omit<User, 'hashedPassword' | 'stripeCustomerId' | 'stripePaymentMethodId'>;

function excludePassword(user: User): SafeUser {
    const { hashedPassword, stripeCustomerId, stripePaymentMethodId, ...safeUser } = user;
    return safeUser;
}

export async function register(userData: RegisterInput): Promise<SafeUser> {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email: userData.email }, { username: userData.username }],
        },
    });

    if (existingUser) {
        throw new Error('Email or username already in use');
    }

    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            email: userData.email,
            username: userData.username,
            hashedPassword,
            firstName: userData.firstName ?? null,
            lastName: userData.lastName ?? null,
            role: userData.role ?? Role.STUDENT,
        },
    });

    return excludePassword(user);
}

export async function login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), {
        expiresIn: '7d',
    });

    return {
        token,
        user: excludePassword(user),
    };
}
