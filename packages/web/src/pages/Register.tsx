import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, CheckCircle, ArrowRight, GraduationCap, Briefcase, Globe, BookOpen } from 'lucide-react';
import logo from '../logo.png';

import { apiClient } from '../lib/api';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
    isInstructor?: boolean;
    bio?: string;
    qualifications?: string;
    cvUrl?: string;
    topics?: string;
};

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [isInstructorRegistered, setIsInstructorRegistered] = useState(false);
    const [searchParams] = useSearchParams();
    const [referredByCode] = useState(() => searchParams.get('ref') || localStorage.getItem('referredByCode') || '');

    const form = useForm<RegisterFormValues>({
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            isInstructor: false,
            bio: '',
            qualifications: '',
            cvUrl: '',
            topics: '',
        },
    });

    const isInstructor = form.watch('isInstructor');

    const registerMutation = useMutation<{ verificationSent: boolean }, unknown, RegisterFormValues>({
        mutationFn: async (values) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { confirmPassword, ...registerData } = values;
            // Clean up optional fields if they are student
            if (!registerData.isInstructor) {
                delete registerData.bio;
                delete registerData.qualifications;
                delete registerData.cvUrl;
                delete registerData.topics;
            }
            
            const payload = {
                ...registerData,
                referredByCode: referredByCode || undefined
            };
            
            const { data } = await apiClient.post('/auth/register', payload);
            
            // Clean up localStorage on successful register call
            if (referredByCode) {
                localStorage.removeItem('referredByCode');
            }
            
            return data;
        },
        onSuccess: async (data, variables) => {
            setRegisteredEmail(variables.email);
            setIsInstructorRegistered(!!variables.isInstructor);
            setRegistrationSuccess(true);

            if (variables.isInstructor) {
                await showSuccessAlert(
                    'Registration Successful!',
                    'Your account has been created. Your teaching application is pending approval. Please check your email to verify your account.'
                );
            } else {
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
            }
        },
        onError: (error) => {
            let message = 'Registration failed. Please try again.';

            if (error instanceof AxiosError) {
                const responseMessage = (error.response?.data as { error?: string; message?: string })?.error || (error.response?.data as { message?: string })?.message;
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
                        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>

                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                                {isInstructorRegistered ? 'Instructor Registration Successful! 🎉' : 'Registration successful! 🎉'}
                            </h1>

                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                                We have sent a verification email to:
                            </p>

                            <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
                                {registeredEmail}
                            </p>

                            {isInstructorRegistered && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 text-left">
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        ℹ️ <strong>Notice:</strong> Your instructor application has been submitted and is pending Admin review. You can log in after verifying your email.
                                    </p>
                                </div>
                            )}

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

                        {referredByCode && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-center">
                                <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                                    🎉 You were invited by a friend! A <strong>10% Welcome Coupon</strong> will be added to your profile immediately after registration.
                                </p>
                            </div>
                        )}

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

                                {/* Instructor Toggle */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-zinc-300 dark:border-zinc-600"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                            Account Type
                                        </span>
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="isInstructor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div
                                                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 ${
                                                    field.value
                                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                                }`}
                                                onClick={() => field.onChange(!field.value)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-300 ${
                                                            field.value
                                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                                : 'bg-zinc-100 dark:bg-zinc-800'
                                                        }`}>
                                                            <GraduationCap className={`h-5 w-5 transition-colors duration-300 ${
                                                                field.value
                                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-zinc-400 dark:text-zinc-500'
                                                            }`} />
                                                        </div>
                                                        <div>
                                                            <p className={`font-semibold text-sm transition-colors duration-300 ${
                                                                field.value
                                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                                    : 'text-zinc-700 dark:text-zinc-300'
                                                            }`}>
                                                                Register as Instructor
                                                            </p>
                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                Create and sell courses on the platform
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Toggle Switch */}
                                                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                                                        field.value ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                                                    }`}>
                                                        <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                                                            field.value ? 'translate-x-5' : 'translate-x-0'
                                                        }`}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {/* Instructor Fields - Animated Section */}
                                <div
                                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                        isInstructor ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                Teaching Profile
                                            </h3>
                                        </div>

                                        {/* Bio */}
                                        <FormField
                                            control={form.control}
                                            name="bio"
                                            rules={isInstructor ? {
                                                required: 'Please enter your bio',
                                                minLength: { value: 30, message: 'Bio must be at least 30 characters' }
                                            } : undefined}
                                            render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'bio'> }) => (
                                                <FormItem>
                                                    <FormLabel className="text-zinc-700 dark:text-zinc-300 text-sm">
                                                        Bio / Introduction <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Short bio about yourself, teaching experience, fields of expertise... (minimum 30 characters)"
                                                            rows={3}
                                                            disabled={registerMutation.isPending}
                                                            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors resize-none"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Qualifications */}
                                        <FormField
                                            control={form.control}
                                            name="qualifications"
                                            rules={isInstructor ? {
                                                required: 'Please enter your qualifications',
                                                minLength: { value: 20, message: 'Qualifications must be at least 20 characters' }
                                            } : undefined}
                                            render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'qualifications'> }) => (
                                                <FormItem>
                                                    <FormLabel className="text-zinc-700 dark:text-zinc-300 text-sm">
                                                        Qualifications / Experience <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="List your degrees, certifications, teaching experience... (minimum 20 characters)"
                                                            rows={3}
                                                            disabled={registerMutation.isPending}
                                                            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors resize-none"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* CV URL */}
                                        <FormField
                                            control={form.control}
                                            name="cvUrl"
                                            rules={isInstructor ? {
                                                validate: (value) => {
                                                    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                                                        return 'URL must start with http:// or https://';
                                                    }
                                                    return true;
                                                }
                                            } : undefined}
                                            render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'cvUrl'> }) => (
                                                <FormItem>
                                                    <FormLabel className="text-zinc-700 dark:text-zinc-300 text-sm">
                                                        CV / Portfolio URL <span className="text-zinc-400 text-xs">(optional)</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                                            <Input
                                                                placeholder="https://linkedin.com/in/your-profile"
                                                                disabled={registerMutation.isPending}
                                                                className="pl-10 h-11 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                                                                {...field}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Topics */}
                                        <FormField
                                            control={form.control}
                                            name="topics"
                                            rules={isInstructor ? {
                                                required: 'Please enter your teaching topics',
                                            } : undefined}
                                            render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'topics'> }) => (
                                                <FormItem>
                                                    <FormLabel className="text-zinc-700 dark:text-zinc-300 text-sm">
                                                        Teaching Topics <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                                            <Input
                                                                placeholder="e.g. Web Development, Machine Learning, UI/UX Design..."
                                                                disabled={registerMutation.isPending}
                                                                className="pl-10 h-11 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                                                                {...field}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                    className={`w-full h-12 text-white font-semibold rounded-lg transition-colors duration-200 ${
                                        isInstructor
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? (
                                        <>
                                            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            {isInstructor ? (
                                                <GraduationCap className="mr-2 h-5 w-5" />
                                            ) : (
                                                <UserPlus className="mr-2 h-5 w-5" />
                                            )}
                                            {isInstructor ? 'Register as Instructor' : 'Register'}
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

