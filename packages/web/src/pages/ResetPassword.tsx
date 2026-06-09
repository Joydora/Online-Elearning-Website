import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '../lib/api';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('Invalid password reset link. Please request a new link.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            showErrorAlert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            showErrorAlert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            showErrorAlert('Error', 'Confirm password does not match');
            return;
        }

        if (!token) {
            return;
        }

        setIsLoading(true);

        try {
            await apiClient.post('/password/reset', { token, password });
            setStatus('success');
            showSuccessAlert('Success!', 'Password has been reset. You can now login.');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.error || 'Could not reset password. Please try again.';

            if (errorCode === 'TOKEN_EXPIRED') {
                setStatus('error');
                setErrorMessage('Password reset link has expired. Please request a new link.');
            } else if (errorCode === 'INVALID_TOKEN') {
                setStatus('error');
                setErrorMessage('Invalid password reset link. Please request a new link.');
            } else {
                showErrorAlert('Error', errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Password reset successful! 🎉
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                        Your password has been reset. You can log in now.
                    </p>
                    <Link to="/login">
                        <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                            Go to login page
                        </Button>
                    </Link>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-4">
                        Redirecting automatically in 3 seconds...
                    </p>
                </Card>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Error
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                        {errorMessage}
                    </p>
                    <div className="space-y-3">
                        <Link to="/forgot-password">
                            <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                                Request new link
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" className="w-full gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        Reset Password
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Enter a new password for your account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            <Lock className="w-4 h-4 inline mr-1" />
                            New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password (minimum 6 characters)"
                                className="h-12 pr-11"
                                disabled={isLoading}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your new password"
                                className="h-12 pr-11"
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-red-600 hover:bg-red-700"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Reset Password
                            </div>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>
                </div>
            </Card>
        </div>
    );
}


