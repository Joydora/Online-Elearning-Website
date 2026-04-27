import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Users, Wallet, ShoppingBag, DollarSign, Edit, Trash2, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { type Course } from '../../components/CourseCard';
import Swal from 'sweetalert2';

type TeacherEarnings = {
    totalGross: number;
    totalPlatformFee: number;
    totalTeacherShare: number;
    heldTeacherShare: number;
    paidTeacherShare: number;
    salesCount: number;
};

export default function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    // Fetch teacher's courses
    const {
        data: courses = [],
        isLoading,
    } = useQuery<Course[]>({
        queryKey: ['teacher-courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/courses');
            // Filter courses by current teacher (backend uses "id" for userId)
            return data.filter((course: Course) => (course.teacher.userId || course.teacher.id) === user?.id);
        },
        enabled: !!user,
    });

    // Delete course mutation
    const deleteMutation = useMutation({
        mutationFn: async (courseId: number) => {
            await apiClient.delete(`/courses/${courseId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
            Swal.fire({
                icon: 'success',
                title: 'Xóa thành công!',
                text: 'Khóa học đã được xóa khỏi hệ thống.',
                timer: 2000,
                showConfirmButton: false,
            });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
            Swal.fire({
                icon: 'error',
                title: 'Lỗi xóa khóa học',
                text: message,
            });
        },
    });

    const handleDeleteCourse = async (courseId: number, courseTitle: string) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa khóa học?',
            html: `Bạn có chắc muốn xóa khóa học <strong>"${courseTitle}"</strong>?<br><br>
                   <span style="color: #dc2626;">Hành động này không thể hoàn tác!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa khóa học',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteMutation.mutate(courseId);
        }
    };

    // Teacher earnings — read-only, from the revenue ledger (admin controls payouts).
    const { data: earnings } = useQuery<TeacherEarnings>({
        queryKey: ['teacher-earnings'],
        queryFn: async () => {
            const { data } = await apiClient.get('/teacher/earnings');
            return data;
        },
        enabled: !!user,
    });

    // Calculate stats
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((acc, course) => acc + (course.totalEnrollments || 0), 0);

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const heldAmount = earnings?.heldTeacherShare ?? 0;
    const paidAmount = earnings?.paidTeacherShare ?? 0;
    const salesCount = earnings?.salesCount ?? 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                        Dashboard Giảng viên
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Chào mừng trở lại, {user?.firstName || user?.username}!
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                    Tổng khóa học
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {totalCourses}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                    Tổng học viên
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {totalStudents}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 dark:border-slate-800" data-testid="held-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                    Thu nhập đang giữ
                                </p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(heldAmount)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Đã chi trả: {formatCurrency(paidAmount)}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 dark:border-slate-800" data-testid="sales-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                    Đã bán
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {salesCount}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Admin quản lý chi trả.
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                                <ShoppingBag className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Khóa học của tôi
                    </h2>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Thống kê
                        </Button>
                        <Link to="/courses/create">
                            <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">
                                <Plus className="h-4 w-4" />
                                Tạo khóa học mới
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Courses List */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="bg-slate-200 dark:bg-slate-700 aspect-video rounded-t-lg"></div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-b-lg space-y-3">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <Card className="p-12 text-center border-slate-200 dark:border-slate-800">
                        <BookOpen className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            Chưa có khóa học nào
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Bắt đầu tạo khóa học đầu tiên của bạn để chia sẻ kiến thức với học viên
                        </p>
                        <Link to="/courses/create">
                            <Button className="gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">
                                <Plus className="h-4 w-4" />
                                Tạo khóa học đầu tiên
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* List View */}
                        <div className="space-y-4">
                            {courses.map((course) => (
                                <Card key={course.courseId || course.id} className="p-6 border-slate-200 dark:border-slate-800">
                                    <div className="flex items-start gap-6">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-slate-700">
                                            {course.thumbnailUrl ? (
                                                <img
                                                    src={course.thumbnailUrl}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                                                        {course.description}
                                                    </p>
                                                    <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            <span>{course.totalEnrollments || 0} học viên</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <DollarSign className="h-4 w-4" />
                                                            <span className="font-medium text-blue-600 dark:text-blue-400">
                                                                {course.price === 0 ? 'Miễn phí' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(course.price)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <Link to={`/courses/${course.courseId || course.id}/manage`}>
                                                        <Button variant="default" size="sm" className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">
                                                            Quản lý
                                                        </Button>
                                                    </Link>
                                                    <Link to={`/courses/${course.courseId || course.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            Xem
                                                        </Button>
                                                    </Link>
                                                    <Link to={`/courses/${course.courseId || course.id}/edit`}>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="gap-2 text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30 dark:text-red-400"
                                                        onClick={() => handleDeleteCourse(course.courseId || course.id || 0, course.title)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
