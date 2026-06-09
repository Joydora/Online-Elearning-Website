import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '../lib/api';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'already_verified';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<VerificationStatus>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await apiClient.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
            } catch (error: any) {
                const errorCode = error.response?.data?.code;
                const errorMessage = error.response?.data?.error;

                if (errorCode === 'TOKEN_EXPIRED') {
                    setStatus('expired');
                    setMessage('Verification link has expired. Please request a new verification email.');
                } else if (errorCode === 'ALREADY_VERIFIED') {
                    setStatus('already_verified');
                    setMessage('This email has already been verified. You can login now.');
                } else if (errorCode === 'INVALID_TOKEN') {
                    setStatus('error');
                    setMessage('Verification link is invalid or has already been used.');
                } else {
                    setStatus('error');
                    setMessage(errorMessage || 'An error occurred during email verification.');
                }
            }
        };

        verifyEmail();
    }, [searchParams]);

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6">
                            <Loader2 className="w-20 h-20 text-red-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                            Verifying email...
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Please wait a moment
                        </p>
                    </>
                );

            case 'success':
                return (
                    <>
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                            Verification successful! 🎉
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            {message}
                        </p>
                        <Link to="/login">
                            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                                Login now
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </>
                );

            case 'already_verified':
                return (
                    <>
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                            Email verified
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            {message}
                        </p>
                        <Link to="/login">
                            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                                Login
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </>
                );

            case 'expired':
                return (
                    <>
                        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                            Link expired
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            {message}
                        </p>
                        <Link to="/resend-verification">
                            <Button className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700">
                                <Mail className="w-4 h-4" />
                                Resend verification email
                            </Button>
                        </Link>
                    </>
                );

            case 'error':
            default:
                return (
                    <>
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                            Verification failed
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            {message}
                        </p>
                        <div className="space-y-3">
                            <Link to="/resend-verification">
                                <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                                    <Mail className="w-4 h-4" />
                                    Resend verification email
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button variant="outline" className="w-full">
                                    Back to login
                                </Button>
                            </Link>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center">
                {renderContent()}
            </Card>
        </div>
    );
}


