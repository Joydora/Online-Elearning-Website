import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth credentials not configured. Google login will not work.');
} else {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;

                    if (!email) {
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    let user = await prisma.user.findUnique({ where: { email } });

                    if (user) {
                        if (!user.isVerified) {
                            user = await prisma.user.update({
                                where: { id: user.id },
                                data: { isVerified: true },
                            });
                        }
                        return done(null, user);
                    }

                    const firstName = profile.name?.givenName || '';
                    const lastName = profile.name?.familyName || '';
                    const username = email.split('@')[0] + '_' + Date.now().toString(36);

                    user = await prisma.user.create({
                        data: {
                            email,
                            username,
                            firstName,
                            lastName,
                            hashedPassword: '',
                            role: Role.STUDENT,
                            isVerified: true,
                        },
                    });

                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
}

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;

