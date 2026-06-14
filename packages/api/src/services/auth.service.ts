import bcrypt from 'bcryptjs';
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
    isInstructor?: boolean;
    bio?: string;
    qualifications?: string;
    cvUrl?: string;
    topics?: string;
    referredByCode?: string;
};

export type LoginResult = {
    token: string;
    user: SafeUser;
    teacherApplicationStatus?: string | null;
};

export type SafeUser = Omit<User, 'hashedPassword'>;

function excludePassword<T extends { hashedPassword: string }>(user: T): Omit<T, 'hashedPassword'> {
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

    if (userData.isInstructor) {
        if (!userData.bio || userData.bio.trim().length < 30) {
            throw new Error('Bio must be at least 30 characters.');
        }
        if (!userData.qualifications || userData.qualifications.trim().length < 20) {
            throw new Error('Qualifications / Experience must be at least 20 characters.');
        }
        if (!userData.topics || !userData.topics.trim()) {
            throw new Error('Teaching topics are required.');
        }
        if (userData.cvUrl && !userData.cvUrl.startsWith('http://') && !userData.cvUrl.startsWith('https://')) {
            throw new Error('CV/Portfolio URL must be valid (start with http:// or https://).');
        }
    }

    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getTokenExpiry();

    const sanitizedUsername = userData.username.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const referralCode = `REF-${sanitizedUsername}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email: userData.email,
                username: userData.username,
                hashedPassword,
                firstName: userData.firstName ?? null,
                lastName: userData.lastName ?? null,
                role: Role.STUDENT, // Starts as student pending admin approval
                isVerified: false,
                verificationToken,
                verificationTokenExpiry,
                referralCode,
            },
        });

        if (userData.isInstructor) {
            await tx.teacherApplication.create({
                data: {
                    userId: newUser.id,
                    bio: userData.bio!.trim(),
                    qualifications: userData.qualifications!.trim(),
                    cvUrl: userData.cvUrl ? userData.cvUrl.trim() : null,
                    topics: userData.topics!.trim(),
                    status: 'PENDING',
                },
            });
        }

        // Handle referral link
        if (userData.referredByCode) {
            const referrer = await tx.user.findUnique({
                where: { referralCode: userData.referredByCode },
            });
            if (referrer) {
                // Link them in Referral table
                await tx.referral.create({
                    data: {
                        referrerId: referrer.id,
                        referredId: newUser.id,
                        status: 'PENDING',
                    },
                });

                // Generate 10% welcome coupon for the new user (referred friend)
                const welcomeCode = `WEL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30); // 30 days expiry

                await tx.promotion.create({
                    data: {
                        code: welcomeCode,
                        description: `10% Welcome Discount for using referral link`,
                        discountType: 'PERCENTAGE',
                        discountValue: 10,
                        usageLimit: 1,
                        startDate: new Date(),
                        endDate: expiry,
                        isActive: true,
                        userId: newUser.id,
                    },
                });

                await tx.notification.create({
                    data: {
                        userId: newUser.id,
                        type: 'REFERRAL_SUCCESS',
                        title: 'Welcome Coupon Earned! 🎁',
                        message: `Welcome to the platform! Since you registered via a friend's referral link, you received a 10% welcome coupon code: ${welcomeCode} (valid for 30 days). You can use this during checkout.`,
                    },
                });
            }
        }

        return newUser;
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
        include: {
            teacherApplication: {
                select: { status: true },
            },
        },
    });

    if (!user) {
        throw new Error('Invalid email/username or password');
    }

    if (user.deletedAt || user.isPermanentlyDeleted) {
        throw new Error(`ACCOUNT_DELETED:${user.deletionReason || ''}`);
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
        teacherApplicationStatus: user.teacherApplication?.status ?? null,
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
