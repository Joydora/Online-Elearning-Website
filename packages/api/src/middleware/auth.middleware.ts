import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined');
    }
    return secret;
}

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'token';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

function isAuthenticatedUser(payload: unknown): payload is AuthenticatedUser {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const candidate = payload as Partial<AuthenticatedUser>;
    return typeof candidate.userId === 'number' && typeof candidate.role === 'string';
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
    try {
        // Try to get token from Authorization header first, then from cookie
        let token = req.cookies?.[COOKIE_NAME];
        
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }

        if (!token) {
            res.status(401).json({ error: 'Authentication token is missing' });
            return;
        }

        const decoded = jwt.verify(token, getJwtSecret());

        if (!isAuthenticatedUser(decoded)) {
            res.status(401).json({ error: 'Invalid authentication token payload' });
            return;
        }

        const authReq = req as AuthenticatedRequest;
        authReq.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
}

// Populate req.user if token present but don't block unauthenticated requests
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    try {
        let token = req.cookies?.[COOKIE_NAME];
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7);
        if (token) {
            const decoded = jwt.verify(token, getJwtSecret());
            if (isAuthenticatedUser(decoded)) {
                (req as AuthenticatedRequest).user = decoded;
            }
        }
    } catch {
        // ignore invalid token for optional auth
    }
    next();
}

export function isAuthorized(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authReq = req as AuthenticatedRequest;

        if (!authReq.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        if (!roles.includes(authReq.user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        next();
    };
}
