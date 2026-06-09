import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, CheckCircle, ArrowRight } from 'lucide-react';
import logo from '../logo.png';

import { apiClient } from '../lib/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { showErrorAlert, showSuccessAlert } from '../lib/sweetalert';

type RegisterFormValues = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
};

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const form = useForm<RegisterFormValues>({
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
        },
    });

    const registerMutation = useMutation<{ verificationSent: boolean }, unknown, RegisterFormValues>({
        mutationFn: async (values) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { confirmPassword, ...registerData } = values;
            const { data } = await apiClient.post('/auth/register', registerData);
            return data;
        },
        onSuccess: async (data, variables) => {
            setRegisteredEmail(variables.email);
            setRegistrationSuccess(true);

            if (data.verificationSent) {
                await showSuccessAlert(
                    'Registration successful!',
                    'Please check your email to verify your account.'
                );
            } else {
                await showSuccessAlert(
                    'Registration successful!',
                    'Account created but verification email could not be sent. Please request a resend.'
                );
            }
        },
        onError: (error) => {
            let message = 'Registration failed. Please try again.';

            if (error instanceof AxiosError) {
                const responseMessage = (error.response?.data as { message?: string })?.message;
                message = responseMessage ?? error.message ?? message;
            } else if (error instanceof Error) {
                message = error.message;
            }

            showErrorAlert('Registration Error', message);
        },
    });

    const onSubmit = form.handleSubmit((values: RegisterFormValues) => {
        if (values.password !== values.confirmPassword) {
            showErrorAlert('Error', 'Confirm password does not match!');
            return;
        }
        registerMutation.mutate(values);
    });

    // Show success message after registration
    if (registrationSuccess) {
        return (
            <section className="relative min-h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-green-400/10 blur-3xl dark:bg-green-600/10"></div>
                    <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10"></div>
                </div>

                <div className="relative z-10 container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
                    <div className="w-full max-w-md">
                        <div className="bg-white dark:bg-zinc-855 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>

                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                                Registration successful! 🎉
                            </h1>

                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                                We have sent a verification email to:
                            </p>

                            <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-6">
                                {registeredEmail}
                            </p>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Important:</strong> Please check your mailbox (including spam/junk folder) and click the verification link to activate your account.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Link to="/login">
                                    <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                                        Go to login page
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>

                                <Link to={`/resend-verification?email=${encodeURIComponent(registeredEmail)}`}>
                                    <Button variant="outline" className="w-full gap-2">
                                        <Mail className="w-4 h-4" />
                                        Resend verification email
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative min-h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl dark:bg-red-600/10"></div>
                <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-red-400/10 blur-3xl dark:bg-red-600/10"></div>
            </div>

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-10">
                <ThemeToggle />
            </div>

            <div className="relative z-10 container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
                <div className="w-full max-w-2xl">
                    {/* Logo/Brand Section */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-800 shadow-[0_10px_30px_rgba(239,68,68,0.35)] ring-2 ring-white/10 dark:ring-red-500/30">
                            <div className="rounded-xl bg-black/60 p-3">
                                <img src={logo} alt="E-Learning Logo" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">
                            E-Learning Platform
                        </h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Start your learning journey today
                        </p>
                    </div>

                    {/* Register Card */}
                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 space-y-6">
                        <header className="space-y-2 text-center">
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Create Account</h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Fill in the information below to start your learning journey
                            </p>
                        </header>

                        <Form {...form}>
                            <form className="grid gap-5" onSubmit={onSubmit}>
                                {/* Username */}
                                <FormField
                                    control={form.control}
                                    name="username"
                                    rules={{
                                        required: 'Please enter your username',
                                        minLength: {
                                            value: 3,
                                            message: 'Username must be at least 3 characters'
                                        },
                                        pattern: {
                                            value: /^[a-zA-Z0-9_]+$/,
                                            message: 'Username can only contain letters, numbers, and underscores'
                                        }
                                    }}
                                    render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'username'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Username</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        placeholder="username123"
                                                        autoComplete="username"
                                                        disabled={registerMutation.isPending}
                                                        className="pl-11 h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Email */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    rules={{
                                        required: 'Please enter your email',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address'
                                        }
                                    }}
                                    render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'email'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        type="email"
                                                        placeholder="example@email.com"
                                                        autoComplete="email"
                                                        disabled={registerMutation.isPending}
                                                        className="pl-11 h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* First and Last Name */}
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        rules={{ required: 'Please enter your first name' }}
                                        render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'firstName'> }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-700 dark:text-zinc-300">First Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="John"
                                                        autoComplete="given-name"
                                                        disabled={registerMutation.isPending}
                                                        className="h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        rules={{ required: 'Please enter your last name' }}
                                        render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'lastName'> }) => (
                                            <FormItem>
                                                <FormLabel className="text-zinc-700 dark:text-zinc-300">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Doe"
                                                        autoComplete="family-name"
                                                        disabled={registerMutation.isPending}
                                                        className="h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Password */}
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
                                    render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'password'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        autoComplete="new-password"
                                                        disabled={registerMutation.isPending}
                                                        className="pl-11 pr-11 h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
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

                                {/* Confirm Password */}
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    rules={{
                                        required: 'Please confirm your password',
                                        validate: (value) => value === form.watch('password') || 'Passwords do not match'
                                    }}
                                    render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'confirmPassword'> }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                                                    <Input
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        autoComplete="new-password"
                                                        disabled={registerMutation.isPending}
                                                        className="pl-11 pr-11 h-12 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-red-500 dark:focus:border-red-400 transition-colors"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                    >
                                                        {showConfirmPassword ? (
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
                                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? (
                                        <>
                                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-5 w-5" />
                                            Register
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-300 dark:border-zinc-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    or continue with
                                </span>
                            </div>
                        </div>

                        {/* Google Signup Button */}
                        <a href="http://localhost:3001/api/auth/google" className="block">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-12 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
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
                                Sign up with Google
                            </Button>
                        </a>

                        {/* Footer Links */}
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-300 dark:border-zinc-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        Already have an account?
                                    </span>
                                </div>
                            </div>

                            <Link to="/login">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-semibold rounded-lg transition-colors duration-200"
                                >
                                    Login
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        By registering, you agree to our{' '}
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

