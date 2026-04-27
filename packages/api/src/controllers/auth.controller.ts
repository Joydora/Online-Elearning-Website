import { Request, Response } from 'express';
import { login, register, RegisterInput } from '../services/auth.service';
import {
    validateEmail,
    validatePassword,
    validateUsername,
} from '../lib/validate';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'token';
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export async function registerController(req: Request, res: Response): Promise<Response> {
    try {
        const { email, username, password, firstName, lastName, role } = req.body ?? {};

        const emailErr = validateEmail(email);
        if (emailErr) return res.status(400).json({ error: emailErr });
        const usernameErr = validateUsername(username);
        if (usernameErr) return res.status(400).json({ error: usernameErr });
        const passwordErr = validatePassword(password);
        if (passwordErr) return res.status(400).json({ error: passwordErr });

        const payload: RegisterInput = {
            email: (email as string).trim().toLowerCase(),
            username: (username as string).trim(),
            password,
            firstName: typeof firstName === 'string' ? firstName.trim().slice(0, 100) : null,
            lastName: typeof lastName === 'string' ? lastName.trim().slice(0, 100) : null,
            role,
        };

        const user = await register(payload);

        return res.status(201).json({
            message: 'Registration successful',
            user,
        });
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'Email or username already in use') {
            return res.status(409).json({ error: message });
        }

        console.error('[register] failed:', error);
        return res.status(500).json({ error: 'Unable to register user' });
    }
}

export async function loginController(req: Request, res: Response): Promise<Response> {
    try {
        const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

        // For login we just need non-empty strings — don't run the full
        // signup regex, the caller may have an older account that
        // predates a tightened rule.
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { token, user } = await login(email.trim().toLowerCase(), password);

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SEVEN_DAYS_IN_MS,
        });

        return res.status(200).json({
            message: 'Login successful',
            user,
        });
    } catch (error) {
        const message = (error as Error).message;

        if (message === 'Invalid email or password') {
            return res.status(401).json({ error: message });
        }

        console.error('[login] failed:', error);
        return res.status(500).json({ error: 'Unable to login user' });
    }
}
