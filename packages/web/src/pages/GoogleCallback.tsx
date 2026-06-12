import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { jwtDecode } from 'jwt-decode';

type DecodedToken = {
    userId: number;
    email: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    exp: number;
};

export default function GoogleCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const setUser = useAuthStore((state) => state.setUser);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            if (errorParam === 'account_deleted') {
                const reason = searchParams.get('reason') || '';
                setError(`Your account has been locked. Reason: ${reason || 'No reason specified'}. Please contact Admin to unlock.`);
                setTimeout(() => navigate('/login'), 6000);
            } else {
                setError('Google login failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
            return;
        }

        if (!token) {
            setError('Token not found. Please try again.');
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

        try {
            // Decode and validate token
            const decoded = jwtDecode<DecodedToken>(token);

            // Check if token is expired
            if (decoded.exp * 1000 < Date.now()) {
                setError('Token has expired. Please login again.');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            // Store token and user info
            localStorage.setItem('token', token);
            setUser({
                id: decoded.userId,
                email: decoded.email,
                username: decoded.email.split('@')[0],
                firstName: null,
                lastName: null,
                role: decoded.role,
                createdAt: new Date(decoded.exp * 1000).toISOString(),
                updatedAt: new Date(decoded.exp * 1000).toISOString(),
            });

            // Redirect based on role
            switch (decoded.role) {
                case 'ADMIN':
                    navigate('/admin');
                    break;
                case 'TEACHER':
                    navigate('/dashboard');
                    break;
                default:
                    navigate('/');
            }
        } catch (err) {
            console.error('Token decode error:', err);
            setError('Invalid token. Please try again.');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [searchParams, navigate, setUser]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Login failed
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
                    <p className="text-sm text-zinc-500 mt-2">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                    Logging in...
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">Please wait a moment</p>
            </div>
        </div>
    );
}


