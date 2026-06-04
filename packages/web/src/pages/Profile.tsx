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
                throw new Error('Mật khẩu mới và xác nhận mật khẩu không khớp');
            }

            const updateData: any = {
                firstName: formData.firstName || null,
                lastName: formData.lastName || null,
                email: formData.email,
                // Username không được thay đổi
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
            showSuccessAlert('Thành công!', 'Thông tin đã được cập nhật.');

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.error || error.message || 'Không thể cập nhật thông tin.';
            showErrorAlert('Lỗi', errorMessage);
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
            showSuccessAlert('Thành công!', 'Cài đặt thông báo đã được lưu.');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || error.message || 'Không thể lưu cài đặt.';
            showErrorAlert('Lỗi', msg);
        },
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'Quản trị viên';
            case 'TEACHER':
                return 'Giảng viên';
            case 'STUDENT':
                return 'Học viên';
            default:
                return role;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Không tìm thấy thông tin
                    </h1>
                    <Button onClick={() => navigate('/')} variant="outline">
                        Quay về trang chủ
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 sm:py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-6 sm:mb-8">
                    Hồ sơ của tôi
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
                                    ⚠️ Email chưa xác thực
                                </div>
                            )}
                        </Card>

                        {/* Stats */}
                        <Card className="p-4 sm:p-6">
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Thống kê</h3>
                            <div className="space-y-4">
                                {profile.role === 'STUDENT' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <BookOpen className="w-5 h-5" />
                                                <span>Khóa học đã đăng ký</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile._count.enrollments}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <Trophy className="w-5 h-5" />
                                                <span>Quiz đã làm</span>
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
                                                <span>Khóa học đã tạo</span>
                                            </div>
                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                {profile._count.coursesAsTeacher}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                                <BookOpen className="w-5 h-5" />
                                                <span>Tổng học viên</span>
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
                                        <span>Tham gia</span>
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
                        <Card className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">
                                Thông tin cá nhân
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
                                            Họ
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            placeholder="Nhập họ"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                            Tên
                                        </label>
                                        <Input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            placeholder="Nhập tên"
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
                                            ⚠️ Email chưa xác thực. Vui lòng kiểm tra hộp thư.
                                        </p>
                                    )}
                                </div>

                                {/* Username - Read only */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        <User className="w-4 h-4 inline mr-1" />
                                        Tên đăng nhập
                                    </label>
                                    <Input
                                        type="text"
                                        value={formData.username}
                                        disabled
                                        className="bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                        Tên đăng nhập không thể thay đổi
                                    </p>
                                </div>

                                {/* Password Section */}
                                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                                        Đổi mật khẩu (tùy chọn)
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                                <Lock className="w-4 h-4 inline mr-1" />
                                                Mật khẩu hiện tại
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPassword ? 'text' : 'password'}
                                                    value={formData.currentPassword}
                                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                                    placeholder="Nhập mật khẩu hiện tại"
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
                                                Mật khẩu mới
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={formData.newPassword}
                                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
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
                                                Xác nhận mật khẩu mới
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    placeholder="Nhập lại mật khẩu mới"
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
                                        {updateProfileMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <Card className="p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                <Bell className="h-5 w-5 text-red-600" />
                                Cài đặt thông báo
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                Bật hoặc tắt từng loại thông báo trên ứng dụng và qua email.
                            </p>

                            {prefsLoading ? (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Đang tải...</p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-left">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Loại</th>
                                                <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 text-center">Trong app</th>
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
                                    {saveNotificationPrefsMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt thông báo'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}


