import { Request, Response } from 'express';
import { login, register, RegisterInput, verifyEmail, resendVerificationEmail } from '../services/auth.service';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'token';
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerController(req: Request, res: Response): Promise<Response> {
    try {
        const { email, username, password, firstName, lastName, role } = req.body ?? {};

        if (!email || !username || !password) {
            return res.status(400).json({
                error: 'Email, username, and password are required',
            });
        }

        const payload: RegisterInput = {
            email,
            username,
            password,
            firstName,
            lastName,
            role,
        };

        const { verificationSent, ...user } = await register(payload);

        return res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            user,
            verificationSent,
        });
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'Email or username already in use') {
            return res.status(409).json({ error: message });
        }

        return res.status(500).json({ error: 'Unable to register user', details: message });
    }
}

export async function loginController(req: Request, res: Response): Promise<Response> {
    try {
        const { email, username, password } = (req.body ?? {}) as { email?: string; username?: string; password?: string };

        // Support both email and username
        const emailOrUsername = email || username;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Email/username and password are required' });
        }

        const { token, user } = await login(emailOrUsername, password);

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SEVEN_DAYS_IN_MS,
        });

        return res.status(200).json({
            message: 'Login successful',
            user,
            token, // Return token for frontend to store
        });
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'Invalid email or password' || message === 'Invalid email/username or password') {
            return res.status(401).json({ error: message });
        }

        if (message === 'EMAIL_NOT_VERIFIED') {
            return res.status(403).json({ 
                error: 'Email not verified',
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.',
            });
        }

        return res.status(500).json({ error: 'Unable to login user', details: message });
    }
}

export async function verifyEmailController(req: Request, res: Response): Promise<Response> {
    try {
        const { token } = req.query as { token?: string };

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await verifyEmail(token);

        return res.status(200).json({
            message: 'Email verified successfully. You can now log in.',
            user,
        });
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'INVALID_TOKEN') {
            return res.status(400).json({ 
                error: 'Invalid verification token',
                code: 'INVALID_TOKEN',
            });
        }

        if (message === 'ALREADY_VERIFIED') {
            return res.status(400).json({ 
                error: 'Email already verified',
                code: 'ALREADY_VERIFIED',
            });
        }

        if (message === 'TOKEN_EXPIRED') {
            return res.status(400).json({ 
                error: 'This link has expired. Please request a new verification email.',
                code: 'TOKEN_EXPIRED',
            });
        }

        return res.status(500).json({ error: 'Unable to verify email', details: message });
    }
}

export async function resendVerificationController(req: Request, res: Response): Promise<Response> {
    try {
        const { email } = req.body as { email?: string };

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const sent = await resendVerificationEmail(email);

        if (sent) {
            return res.status(200).json({
                message: 'Verification email sent. Please check your inbox.',
            });
        } else {
            return res.status(500).json({
                error: 'Failed to send verification email. Please try again later.',
            });
        }
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        if (message === 'ALREADY_VERIFIED') {
            return res.status(400).json({ 
                error: 'This email is already verified. You can log in.',
                code: 'ALREADY_VERIFIED',
            });
        }

        return res.status(500).json({ error: 'Unable to resend verification email', details: message });
    }
}
