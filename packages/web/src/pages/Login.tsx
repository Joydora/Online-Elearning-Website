import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Eye, EyeOff, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import logo from '../logo.png';

import { apiClient } from '../lib/api';
import { useAuthStore, type User } from '../stores/useAuthStore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { showErrorAlert, showSuccessAlert } from '../lib/sweetalert';

type LoginFormValues = {
    emailOrUsername: string;
    password: string;
};

type LoginResponse = {
    message: string;
    user: User;
    token: string;
    teacherApplicationStatus?: string | null;
};

export default function Login() {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);
    const [showPassword, setShowPassword] = useState(false);
    const [emailNotVerified, setEmailNotVerified] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');

    const form = useForm<LoginFormValues>({
        defaultValues: {
            emailOrUsername: '',
            password: '',
        },
    });

    const loginMutation = useMutation<LoginResponse, unknown, LoginFormValues>({
        mutationFn: async (values) => {
            // Send as email or username (backend will handle both)
            const { data } = await apiClient.post<LoginResponse>('/auth/login', {
                email: values.emailOrUsername,
                username: values.emailOrUsername,
                password: values.password,
            });
            return data;
        },
        onSuccess: async (data) => {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            setUser(data.user);

            await showSuccessAlert(
                'Login successful!',
                `Welcome back, ${data.user.firstName || data.user.username}!`
            );

            const isTeacher = data.user.role === 'TEACHER';
            const isAdmin = data.user.role === 'ADMIN';
            const hasPendingApplication = data.teacherApplicationStatus === 'PENDING' || data.teacherApplicationStatus === 'REJECTED';

            if (isAdmin) {
                navigate('/admin');
            } else if (isTeacher) {
                // Approved teachers have application status APPROVED or null (direct teachers)
                if (hasPendingApplication) {
                    navigate('/teacher/pending');
                } else {
                    navigate('/dashboard');
                }
            } else if (hasPendingApplication) {
                // Student with a pending teacher application
                navigate('/teacher/pending');
            } else {
                navigate('/');
            }
        },
        onError: (error) => {
            let message = 'Login failed. Please try again.';

            if (error instanceof AxiosError) {
                const errorCode = error.response?.data?.code;
                const errorMessage = error.response?.data?.message || error.response?.data?.error;

                if (errorCode === 'EMAIL_NOT_VERIFIED') {
                    setEmailNotVerified(true);
                    setUnverifiedEmail(form.getValues('emailOrUsername'));
                    return; // Don't show generic error alert
                }

                message = errorMessage ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }

            setEmailNotVerified(false);
            showErrorAlert('Login Error', message);
        },
    });

    const onSubmit = form.handleSubmit((values: LoginFormValues) => {
        loginMutation.mutate(values);
    });

    return (
        <section className="relative min-h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl dark:bg-red-600/10"></div>
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-zinc-300/20 blur-3xl dark:bg-zinc-700/20"></div>
            </div>

            <div className="relative z-10 container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
                <div className="w-full max-w-md">
                    {/* Logo/Brand Section */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 via-red-600 to-red-800 shadow-[0_10px_30px_rgba(239,68,68,0.35)] ring-2 ring-white/10 dark:ring-red-500/30">
                            <div className="rounded-xl bg-black/60 p-2.5">
                                <img src={logo} alt="E-Learning Logo" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                            E-Learning Platform
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Where knowledge knows no bounds
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
                        <header className="space-y-2 text-center">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Login</h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Welcome back! Please login to continue.
                            </p>
                        </header>

                        {/* Email Not Verified Warning */}
                        {emailNotVerified && (
                            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                                            Email not verified
                                        </h3>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                                            Please check your mailbox <strong>{unverifiedEmail}</strong> and click the verification link.
                                        </p>
                                        <Link
                                            to={`/resend-verification?email=${encodeURIComponent(unverifiedEmail)}`}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
                                        >
                                            <Mail className="h-4 w-4" />
                                            Resend verification email
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Form {...form}>
                            <form className="space-y-5" onSubmit={onSubmit}>
                                <FormField
                                    control={form.control}
                                    name="emailOrUsername"
                                    rules={{
                                        required: 'Please enter your email or username',
                                    }}
                                    render={({ field }: { field: ControllerRenderProps<LoginFormValues, 'emailOrUsername'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Email or Username</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        type="text"
                                                        placeholder="email@example.com or username"
                                                        autoComplete="username"
                                                        disabled={loginMutation.isPending}
                                                        className="pl-11 h-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Forgot Password Link */}
                                <div className="text-right">
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="password"
                                    rules={{
                                        required: 'Please enter your password',
                                        minLength: {
                                            value: 6,
                                            message: 'Password must be at least 6 characters'
                                        }
                                    }}
                                    render={({ field }: { field: ControllerRenderProps<LoginFormValues, 'password'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        autoComplete="current-password"
                                                        disabled={loginMutation.isPending}
                                                        className="pl-11 pr-11 h-12 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? (
                                        <>
                                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Logging in...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="mr-2 h-5 w-5" />
                                            Login
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                                    or continue with
                                </span>
                            </div>
                        </div>

                        {/* Google Login Button */}
                        <a href="http://localhost:3001/api/auth/google" className="block">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </Button>
                        </a>

                        {/* Footer Links */}
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                                        Don't have an account?
                                    </span>
                                </div>
                            </div>

                            <Link to="/register">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium rounded-lg transition-all duration-200"
                                >
                                    Register now
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        By logging in, you agree to our{' '}
                        <Link to="/terms" className="font-medium text-red-600 hover:text-red-500 dark:text-red-400">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="font-medium text-red-600 hover:text-red-500 dark:text-red-400">
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}

