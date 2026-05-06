import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Users, FileText, Edit, Trash2, UserCheck, UserCircle, Wallet } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { type Course } from '../../components/CourseCard';
import Swal from 'sweetalert2';

type TeacherCourse = Course & {
    status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
    modules?: Array<{
        _count?: {
            contents: number;
        };
    }>;
    _count?: {
        enrollments: number;
        modules?: number;
    };
};

export default function Dashboard() {
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    // Fetch teacher's courses
    const {
        data: courses = [],
        isLoading,
    } = useQuery<TeacherCourse[]>({
        queryKey: ['teacher-courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/teacher/courses');
            return data;
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

    // Calculate stats
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((acc, course) => acc + (course._count?.enrollments || 0), 0);
    const totalLessons = courses.reduce(
        (acc, course) =>
            acc + (course.modules ?? []).reduce((sum, module) => sum + (module._count?.contents ?? 0), 0),
        0,
    );

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Dashboard Giảng viên
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Chào mừng trở lại, {user?.firstName || user?.username}!
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="p-6 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                    Lớp đang quản lý
                                </p>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                    {totalCourses}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                    Học viên
                                </p>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                    {totalStudents}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600">
                                <Users className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                    Bài học
                                </p>
                                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                                    {totalLessons}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                            Khóa học của tôi
                        </h2>
                        <Link to="/profile">
                            <Button variant="outline" className="gap-2">
                                <UserCircle className="h-4 w-4" />
                                Cập nhật hồ sơ
                            </Button>
                        </Link>
                        <Link to="/teacher/earnings">
                            <Button variant="outline" className="gap-2">
                                <Wallet className="h-4 w-4" />
                                Tiền đang giữ
                            </Button>
                        </Link>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Link to="/courses/create">
                            <Button className="gap-2 bg-red-600 hover:bg-red-700">
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
                                <div className="bg-zinc-200 dark:bg-zinc-700 aspect-video rounded-t-lg"></div>
                                <div className="bg-white dark:bg-zinc-800 p-5 rounded-b-lg space-y-3">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <Card className="p-12 text-center border-zinc-200 dark:border-zinc-800">
                        <BookOpen className="h-16 w-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                            Chưa có khóa học nào
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            Bắt đầu tạo khóa học đầu tiên của bạn để chia sẻ kiến thức với học viên
                        </p>
                        <Link to="/courses/create">
                            <Button className="gap-2 bg-red-600 hover:bg-red-700">
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
                                <Card key={course.courseId || course.id} className="p-6 border-zinc-200 dark:border-zinc-800">
                                    <div className="flex items-start gap-6">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0 w-48 aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                            {course.thumbnailUrl ? (
                                                <img
                                                    src={course.thumbnailUrl}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <BookOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2 break-all">
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2 break-all">
                                                        {course.description}
                                                    </p>
                                                    <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                                                        <div className="flex items-center gap-1">
                                                            <Users className="h-4 w-4" />
                                                            <span>{course._count?.enrollments ?? course.totalEnrollments ?? 0} học viên</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="h-4 w-4" />
                                                            <span>
                                                                {(course.modules ?? []).reduce((sum, module) => sum + (module._count?.contents ?? 0), 0)} bài học
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <Link to={`/courses/${course.courseId || course.id}/manage`}>
                                                        <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700">
                                                            Quản lý
                                                        </Button>
                                                    </Link>
                                                    <Link to={`/courses/${course.courseId || course.id}/students`}>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <UserCheck className="h-4 w-4" />
                                                            Học viên
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
                                                        className="gap-2 text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/30 dark:text-red-400"
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

