import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Lock,
    Save,
    Eye,
    EyeOff,
    Calendar,
    Award,
    BookOpen,
    GraduationCap,
    Trophy,
    Bell,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

type NotificationPreferenceRow = {
    type: string;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    label: string;
};

type UserProfile = {
    id: number;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    role: string;
    createdAt: string;
    isVerified: boolean;
    totalStudents?: number; // For teachers: total students enrolled in their courses
    _count: {
        enrollments: number;
        coursesAsTeacher: number;
        quizAttempts: number;
    };
};

export default function Profile() {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);
    const queryClient = useQueryClient();

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Fetch user profile
    const { data: profile, isLoading } = useQuery<UserProfile>({
        queryKey: ['user-profile'],
        queryFn: async () => {
            const { data } = await apiClient.get('/users/profile');
            return data;
        },
    });

    const [activeTab, setActiveTab] = useState<'profile' | 'referrals'>('profile');

    // Fetch referrals info (only for student role)
    const { data: referralData } = useQuery({
        queryKey: ['my-referrals'],
        queryFn: async () => {
            const { data } = await apiClient.get('/users/referrals');
            return data;
        },
        enabled: profile?.role === 'STUDENT',
    });

    // Update form data when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                email: profile.email,
                username: profile.username,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        }
    }, [profile]);

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async () => {
            if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
                throw new Error('New password and confirm password do not match');
            }

            const updateData: any = {
                firstName: formData.firstName || null,
                lastName: formData.lastName || null,
                email: formData.email,
                // Username cannot be changed
            };

            if (formData.newPassword) {
                updateData.currentPassword = formData.currentPassword;
                updateData.newPassword = formData.newPassword;
            }

            const { data } = await apiClient.put('/users/profile', updateData);
            return data;
        },
        onSuccess: (data) => {
            // Update auth store
            setUser(data.user);
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            showSuccessAlert('Success!', 'Profile information updated successfully.');

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error || error.message || 'Could not update profile.';
            showErrorAlert('Error', errorMessage);
        },
    });

    const [prefDraft, setPrefDraft] = useState<NotificationPreferenceRow[]>([]);

    const { data: notificationPreferences, isLoading: prefsLoading } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: async () => {
            const { data } = await apiClient.get('/notifications/preferences');
            return data.preferences as NotificationPreferenceRow[];
        },
        enabled: !!profile,
    });

    useEffect(() => {
        if (notificationPreferences) {
            setPrefDraft(notificationPreferences);
        }
    }, [notificationPreferences]);

    const saveNotificationPrefsMutation = useMutation({
        mutationFn: async () => {
            await apiClient.put('/notifications/preferences', { preferences: prefDraft });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
            showSuccessAlert('Success!', 'Notification settings saved.');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || error.message || 'Could not save settings.';
            showErrorAlert('Error', msg);
        },
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'Admin';
            case 'TEACHER':
                return 'Teacher';
            case 'STUDENT':
                return 'Student';
            default:
                return role;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Profile not found
                    </h1>
                    <Button onClick={() => navigate('/')} variant="outline">
                        Back to home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 sm:py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-6 sm:mb-8">
                    My Profile
                </h1>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Sidebar - Stats */}
                    <div className="space-y-6">
                        {/* Avatar Card */}
                        <Card className="p-4 sm:p-6 text-center">
                            <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                                {profile.fullName.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                                {profile.fullName}
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">@{profile.username}</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
                                <Award className="w-4 h-4" />
                                {getRoleName(profile.role)}
                            </div>
                            {!profile.isVerified && (
                                <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                                    ⚠️ Email not verified
                                </div>
                            )}
                        </Card>

                        {/* Stats */}
                        <Card className="p-4 sm:p-6">
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Statistics</h3>
                            <div className="space-y-4">
                                {profile.role === 'STUDENT' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <BookOpen className="w-5 h-5" />
                                                <span>Enrolled courses</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile._count.enrollments}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <Trophy className="w-5 h-5" />
                                                <span>Quizzes taken</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile._count.quizAttempts}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {profile.role === 'TEACHER' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <GraduationCap className="w-5 h-5" />
                                                <span>Courses created</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile._count.coursesAsTeacher}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <BookOpen className="w-5 h-5" />
                                                <span>Total students</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile.totalStudents || 0}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                        <Calendar className="w-5 h-5" />
                                        <span>Joined</span>
                                    </div>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                                        {formatDate(profile.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tab Headers */}
                        {profile.role === 'STUDENT' && (
                            <div className="flex border-b border-zinc-200 dark:border-zinc-805 pb-1 gap-4 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('profile')}
                                    className={`pb-2 text-sm font-semibold border-b-2 transition-all ${
                                        activeTab === 'profile'
                                            ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                                    }`}
                                >
                                    Personal Details
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('referrals')}
                                    className={`pb-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                                        activeTab === 'referrals'
                                            ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-500'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                                    }`}
                                >
                                    Referral Program 🎁
                                </button>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <>
                                <Card className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                                Personal Information
                            </h2>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    updateProfileMutation.mutate();
                                }}
                                className="space-y-6"
                            >
                                {/* Name Fields */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                            First Name
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            placeholder="Enter first name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                            Last Name
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            placeholder="Enter last name"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        <Mail className="w-4 h-4 inline mr-1" />
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                    {!profile.isVerified && (
                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                            ⚠️ Email not verified. Please check your mailbox.
                                        </p>
                                    )}
                                </div>

                                {/* Username - Read only */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Username
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.username}
                                        disabled
                                        className="bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                        Username cannot be changed
                                    </p>
                                </div>

                                {/* Password Section */}
                                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Change Password (optional)
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                <Lock className="w-4 h-4 inline mr-1" />
                                                Current Password
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    value={formData.currentPassword}
                                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                                    placeholder="Enter current password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={formData.newPassword}
                                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                    placeholder="Enter new password (minimum 6 characters)"
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    placeholder="Confirm your new password"
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
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={updateProfileMutation.isPending}
                                        className="gap-2 bg-red-600 hover:bg-red-700"
                                    >
                                        <Save className="w-4 h-4" />
                                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <Card className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                <Bell className="h-5 w-5 text-red-600" />
                                Notification Settings
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                Enable or disable notification types in-app and via email.
                            </p>

                            {prefsLoading ? (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-left">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Type</th>
                                                <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 text-center">In-app</th>
                                                <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 text-center">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prefDraft.map((row, index) => (
                                                <tr
                                                    key={row.type}
                                                    className="border-t border-zinc-200 dark:border-zinc-800"
                                                >
                                                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                                                        {row.label}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-red-600"
                                                            checked={row.inAppEnabled}
                                                            onChange={(e) => {
                                                                const next = [...prefDraft];
                                                                next[index] = { ...row, inAppEnabled: e.target.checked };
                                                                setPrefDraft(next);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-red-600"
                                                            checked={row.emailEnabled}
                                                            onChange={(e) => {
                                                                const next = [...prefDraft];
                                                                next[index] = { ...row, emailEnabled: e.target.checked };
                                                                setPrefDraft(next);
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="mt-4">
                                <Button
                                    type="button"
                                    disabled={saveNotificationPrefsMutation.isPending || prefsLoading}
                                    onClick={() => saveNotificationPrefsMutation.mutate()}
                                    className="gap-2 bg-red-600 hover:bg-red-700"
                                >
                                    <Save className="w-4 h-4" />
                                    {saveNotificationPrefsMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
                                </Button>
                            </div>
                        </Card>
                    </>
                )}

                        {activeTab === 'referrals' && referralData && (
                            <div className="space-y-6 animate-fadeIn">
                                {/* Invite Card */}
                                <Card className="p-5 sm:p-6 bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 pointer-events-none">
                                        <Trophy className="w-24 h-24 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                                        Refer Friends & Study Together!
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-xl leading-relaxed">
                                        Share the joy of learning with your friends. Send them your unique invite link:
                                        they will get a <strong className="text-green-600 dark:text-green-400">10% Welcome Coupon</strong> off their first purchase, and you will earn a <strong className="text-red-600 dark:text-red-400">20% Discount Coupon</strong> for every friend who purchases a course!
                                    </p>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Your Personal Invite Link
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${window.location.origin}/register?ref=${referralData.referralCode}`}
                                                className="bg-white dark:bg-zinc-950 border-zinc-300 text-sm font-mono h-11"
                                            />
                                            <Button
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 h-11"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/register?ref=${referralData.referralCode}`;
                                                    navigator.clipboard.writeText(link);
                                                    showSuccessAlert('Copied!', 'Invite link copied to clipboard.');
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                                {/* Referral Statistics */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Card className="p-4 flex flex-col justify-between h-28 border border-zinc-200 dark:border-zinc-800">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Friends Invited
                                        </span>
                                        <span className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                                            {referralData.referralsCount}
                                        </span>
                                        <span className="text-xs text-zinc-400">Total signups via link</span>
                                    </Card>
                                    <Card className="p-4 flex flex-col justify-between h-28 border border-zinc-200 dark:border-zinc-800">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Successful Referrals
                                        </span>
                                        <span className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                                            {referralData.referralsCompletedCount}
                                        </span>
                                        <span className="text-xs text-zinc-400">Completed first purchase</span>
                                    </Card>
                                    <Card className="p-4 flex flex-col justify-between h-28 border border-zinc-200 dark:border-zinc-800">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Vouchers Earned
                                        </span>
                                        <span className="text-3xl font-extrabold text-amber-500">
                                            {referralData.earnedCoupons.length}
                                        </span>
                                        <span className="text-xs text-zinc-400">Coupons issued to you</span>
                                    </Card>
                                </div>

                                {/* My Referral Coupons */}
                                <Card className="p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
                                    <h4 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        🎁 My Referral Discount Vouchers
                                    </h4>
                                    {referralData.earnedCoupons.length === 0 ? (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
                                            No vouchers earned yet. Share your invite link to get your first reward!
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {referralData.earnedCoupons.map((coupon: any) => {
                                                const isUsed = coupon.usedCount >= (coupon.usageLimit || 1);
                                                const isExpired = new Date(coupon.endDate) < new Date();
                                                const isActive = coupon.isActive && !isUsed && !isExpired;
                                                
                                                return (
                                                    <div
                                                        key={coupon.id}
                                                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative overflow-hidden transition-all ${
                                                            isActive
                                                                ? 'border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm animate-pulseFast'
                                                                : 'border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10 opacity-70'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                                                                    {coupon.description || 'Referral Coupon'}
                                                                </span>
                                                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                                                    {coupon.discountValue}% OFF
                                                                </p>
                                                            </div>
                                                            <div>
                                                                {isUsed ? (
                                                                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                                                                        Used
                                                                    </span>
                                                                ) : isExpired ? (
                                                                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                                                                        Expired
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                                            <div>
                                                                <span className="block text-[10px] text-zinc-400 uppercase tracking-wide">
                                                                    Promo Code
                                                                </span>
                                                                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 select-all">
                                                                    {coupon.code}
                                                                </span>
                                                            </div>
                                                            {isActive && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    type="button"
                                                                    className="h-8 text-xs border-amber-300 hover:bg-amber-500/10"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(coupon.code);
                                                                        showSuccessAlert('Copied!', 'Promo code copied.');
                                                                    }}
                                                                >
                                                                    Copy
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400">
                                                            Valid until {formatDate(coupon.endDate)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                                {/* Referral History */}
                                <Card className="p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
                                    <h4 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                        👥 Referred Friends History
                                    </h4>
                                    {referralData.referrals.length === 0 ? (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
                                            No friends referred yet. Send them your invite link above!
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <table className="w-full text-sm">
                                                <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-left">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Friend</th>
                                                        <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Joined Date</th>
                                                        <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {referralData.referrals.map((ref: any) => (
                                                        <tr key={ref.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                                            <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 font-medium">
                                                                {ref.friend.fullName}
                                                            </td>
                                                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                                                                {formatDate(ref.friend.joinedAt)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {ref.status === 'COMPLETED' ? (
                                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 font-medium">
                                                                        Completed
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 font-medium font-semibold">
                                                                        Pending Purchase
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


