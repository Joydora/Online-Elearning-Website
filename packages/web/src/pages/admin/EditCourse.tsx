import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, X, Image } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

export default function AdminEditCourse() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        categoryId: 0,
        teacherId: 0,
        thumbnailUrl: '',
        trialDurationDays: '',
        accessDurationDays: '',
    });
    const [uploading, setUploading] = useState(false);

    const { data: course, isLoading } = useQuery({
        queryKey: ['admin-course', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/admin/courses/${id}`);
            return data;
        },
        enabled: !!id,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/categories');
            return data;
        },
    });

    const { data: teachers = [] } = useQuery({
        queryKey: ['teachers'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users?role=TEACHER');
            return data;
        },
    });

    useEffect(() => {
        if (course) {
            setFormData({
                title: course.title,
                description: course.description,
                price: course.price,
                categoryId: course.categoryId,
                teacherId: course.teacherId,
                thumbnailUrl: course.thumbnailUrl || '',
                trialDurationDays: course.trialDurationDays ? String(course.trialDurationDays) : '',
                accessDurationDays: course.accessDurationDays ? String(course.accessDurationDays) : '',
            });
        }
    }, [course]);

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showErrorAlert('Lỗi', 'Vui lòng chọn file ảnh');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showErrorAlert('Lỗi', 'Kích thước ảnh tối đa là 5MB');
            return;
        }

        setUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);

            const { data } = await apiClient.post('/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setFormData(prev => ({ ...prev, thumbnailUrl: data.url }));
        } catch (error) {
            showErrorAlert('Lỗi', 'Không thể upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    const removeThumbnail = () => {
        setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
    };

    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await apiClient.put(`/admin/courses/${id}`, data);
        },
        onSuccess: () => {
            showSuccessAlert('Thành công', 'Đã cập nhật khóa học');
            navigate('/admin/courses');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể cập nhật khóa học');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description || !formData.categoryId || !formData.teacherId) {
            showErrorAlert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8 flex items-center justify-center">
                <div className="text-center">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="container mx-auto max-w-3xl">
                <Button variant="ghost" onClick={() => navigate('/admin/courses')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                </Button>
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-6">Chỉnh sửa khóa học</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Tên khóa học</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="Nhập tên khóa học"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="Nhập mô tả khóa học"
                                rows={5}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Giá (VND)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="0"
                                min="0"
                                step="1"
                                required
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium mb-2">Số ngày học thử</label>
                                <input
                                    type="number"
                                    value={formData.trialDurationDays}
                                    onChange={(e) => setFormData({ ...formData, trialDurationDays: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                    placeholder="VD: 7"
                                    min="1"
                                />
                                <p className="mt-1 text-xs text-zinc-500">Để trống nếu không cho học thử.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Thời hạn truy cập sau khi mua</label>
                                <input
                                    type="number"
                                    value={formData.accessDurationDays}
                                    onChange={(e) => setFormData({ ...formData, accessDurationDays: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                    placeholder="Để trống = không giới hạn"
                                    min="1"
                                />
                                <p className="mt-1 text-xs text-zinc-500">Ví dụ 30 nghĩa là học viên có 30 ngày truy cập.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Danh mục</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                required
                            >
                                {categories.map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Giảng viên</label>
                            <select
                                value={formData.teacherId}
                                onChange={(e) => setFormData({ ...formData, teacherId: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                required
                            >
                                {teachers.map((teacher: any) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.firstName} {teacher.lastName} (@{teacher.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Thumbnail Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Ảnh thumbnail</label>
                            {formData.thumbnailUrl ? (
                                <div className="relative w-full max-w-md">
                                    <img
                                        src={formData.thumbnailUrl}
                                        alt="Thumbnail"
                                        className="w-full aspect-video object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full max-w-md h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {uploading ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                        ) : (
                                            <>
                                                <Image className="w-10 h-10 text-zinc-400 mb-3" />
                                                <p className="text-sm text-zinc-500">
                                                    <span className="font-semibold text-red-600">Nhấn để upload</span> hoặc kéo thả
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-1">PNG, JPG (tối đa 5MB)</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/admin/courses')}
                            >
                                Hủy
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}


