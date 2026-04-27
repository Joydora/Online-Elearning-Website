import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Edit, FolderOpen, Plus } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

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
                    <Button
                        onClick={() => navigate('/admin/courses/create')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Tạo khóa học mới
                    </Button>
                </div>
                <div className="grid gap-4">
                    {courses.map((course: any) => (
                        <Card key={course.id} className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{course.title}</h3>
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


