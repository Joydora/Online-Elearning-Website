import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Edit, FolderOpen, Plus, ClipboardCheck } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

const STATUS_LABELS: Record<CourseStatus, string> = {
    DRAFT: 'Bản nháp',
    PENDING_REVIEW: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    PUBLISHED: 'Đã xuất bản',
};

const STATUS_COLORS: Record<CourseStatus, string> = {
    DRAFT: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function ManageCourses() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: courses = [] } = useQuery({
        queryKey: ['admin-courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/courses');
            return data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (courseId: number) => {
            await apiClient.delete(`/admin/courses/${courseId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            showSuccessAlert('Thành công', 'Đã xóa khóa học');
        },
        onError: (error: any) => {
            // Surface server-side message (e.g., cannot delete because course has enrollments)
            const apiMessage =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Không thể xóa khóa học';
            showErrorAlert('Lỗi', apiMessage);
        },
    });

    const handleDelete = async (courseId: number, title: string) => {
        const result = await showConfirmAlert(
            'Xóa khóa học',
            `Bạn có chắc chắn muốn xóa khóa học "${title}"?`
        );
        if (result.isConfirmed) {
            deleteMutation.mutate(courseId);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="container mx-auto max-w-6xl">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                </Button>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Quản lý Khóa học</h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => navigate('/admin/courses/review')}
                            variant="outline"
                            className="border-amber-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
                        >
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Duyệt khóa học
                        </Button>
                        <Button
                            onClick={() => navigate('/admin/courses/create')}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Tạo khóa học mới
                        </Button>
                    </div>
                </div>
                <div className="grid gap-4">
                    {courses.map((course: any) => (
                        <Card key={course.id} className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg">{course.title}</h3>
                                        {course.status && (
                                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[course.status as CourseStatus]}`}>
                                                {STATUS_LABELS[course.status as CourseStatus] ?? course.status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Giảng viên: {course.teacher?.firstName} {course.teacher?.lastName} |
                                        Danh mục: {course.category?.name} |
                                        Enrollments: {course._count?.enrollments}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right mr-4">
                                        <p className="font-bold text-red-600">
                                            {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString()} VND`}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/admin/courses/${course.id}/manage`)}
                                        title="Quản lý nội dung"
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                        title="Sửa"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(course.id, course.title)}
                                        disabled={deleteMutation.isPending}
                                        title="Xóa"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}


