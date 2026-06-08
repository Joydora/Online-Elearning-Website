import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, Role, User } from '@prisma/client';
import { sendVerificationEmail } from './email.service';

const prisma = new PrismaClient();

// Generate verification token
function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Token expiry (24 hours)
function getTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    return expiry;
}

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

export type SafeUser = Omit<User, 'hashedPassword'>;

function excludePassword(user: User): SafeUser {
    const { hashedPassword, ...safeUser } = user;
    return safeUser;
}

export async function register(userData: RegisterInput): Promise<SafeUser & { verificationSent: boolean }> {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email: userData.email }, { username: userData.username }],
        },
    });

    if (existingUser) {
        throw new Error('Email or username already in use');
    }

    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getTokenExpiry();

    const user = await prisma.user.create({
        data: {
            email: userData.email,
            username: userData.username,
            hashedPassword,
            firstName: userData.firstName ?? null,
            lastName: userData.lastName ?? null,
            role: userData.role ?? Role.STUDENT,
            isVerified: false,
            verificationToken,
            verificationTokenExpiry,
        },
    });

    // Send verification email (async, don't block registration)
    const emailSent = await sendVerificationEmail(user.email, user.username, verificationToken);

    return {
        ...excludePassword(user),
        verificationSent: emailSent,
    };
}

export async function login(emailOrUsername: string, password: string): Promise<LoginResult> {
    // Try to find user by email or username
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: emailOrUsername },
                { username: emailOrUsername },
            ],
        },
    });

    if (!user) {
        throw new Error('Invalid email/username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
        throw new Error('Invalid email/username or password');
    }

    // Check if email is verified
    if (!user.isVerified) {
        throw new Error('EMAIL_NOT_VERIFIED');
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), {
        expiresIn: '7d',
    });

    return {
        token,
        user: excludePassword(user),
    };
}

// Verify email with token
export async function verifyEmail(token: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
        where: { verificationToken: token },
    });

    if (!user) {
        throw new Error('INVALID_TOKEN');
    }

    if (user.isVerified) {
        throw new Error('ALREADY_VERIFIED');
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
        throw new Error('TOKEN_EXPIRED');
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            isVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
        },
    });

    return excludePassword(updatedUser);
}

// Resend verification email
export async function resendVerificationEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    if (user.isVerified) {
        throw new Error('ALREADY_VERIFIED');
    }

    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getTokenExpiry();

    await prisma.user.update({
        where: { id: user.id },
        data: {
            verificationToken,
            verificationTokenExpiry,
        },
    });

    return await sendVerificationEmail(user.email, user.username, verificationToken);
}
