import { Router, Request, Response } from 'express';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { loginController, registerController, verifyEmailController, resendVerificationController } from '../controllers/auth.controller';
import { isAuthenticated, isAuthorized } from '../middleware/auth.middleware';
import { AuthenticatedUser } from '../types/auth';
import passport from '../config/passport';

const router = Router();

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret_change_in_production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/register', registerController);
router.post('/login', loginController);
router.get('/verify-email', verifyEmailController);
router.post('/resend-verification', resendVerificationController);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
}));

router.get('/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
        session: false 
    }),
    (req: Request, res: Response) => {
        try {
            const user = req.user as any;
            
            if (!user) {
                return res.redirect(`${FRONTEND_URL}/login?error=no_user`);
            }

            if (user.deletedAt || user.isPermanentlyDeleted) {
                return res.redirect(`${FRONTEND_URL}/auth/google/callback?error=account_deleted&reason=${encodeURIComponent(user.deletionReason || '')}`);
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Redirect to frontend with token
            return res.redirect(`${FRONTEND_URL}/auth/google/callback?token=${token}`);
        } catch (error) {
            console.error('Google callback error:', error);
            return res.redirect(`${FRONTEND_URL}/login?error=callback_error`);
        }
    }
);
router.post('/logout', isAuthenticated, (req: Request, res: Response) => {
    // Clear the cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return res.status(200).json({ message: 'Logged out successfully' });
});

// Demo route to verify auth/authorization middleware. Remove or adjust once tested.
router.get(
    '/me/admin',
    isAuthenticated,
    isAuthorized([Role.ADMIN]),
    (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user) {
            return res.status(500).json({ error: 'Authenticated user context missing' });
        }

        return res.json({ message: 'You reached an admin-only route!', user: authReq.user });
    }
);

export default router;
