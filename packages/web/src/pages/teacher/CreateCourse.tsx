import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, Image, X } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type Category = {
    id: number;
    name: string;
};

type CourseFormValues = {
    title: string;
    description: string;
    syllabus: string;
    price: number;
    categoryId: number;
    thumbnailUrl: string;
};

export default function CreateCourse() {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);

    const form = useForm<CourseFormValues>({
        defaultValues: {
            title: '',
            description: '',
            syllabus: '',
            price: 0,
            categoryId: 0,
            thumbnailUrl: '',
        },
    });

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

            form.setValue('thumbnailUrl', data.url);
        } catch (error) {
            showErrorAlert('Lỗi', 'Không thể upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    const removeThumbnail = () => {
        form.setValue('thumbnailUrl', '');
    };

    // Fetch categories
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/categories');
            return data;
        },
    });

    // Create course mutation
    const createMutation = useMutation({
        mutationFn: async (values: CourseFormValues) => {
            const { data } = await apiClient.post('/courses', {
                ...values,
                syllabus: {
                    outline: values.syllabus,
                },
            });
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert(
                'Tạo khóa học thành công!',
                'Khóa học của bạn đã được tạo. Bạn có thể thêm modules và nội dung bây giờ.'
            );
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
            showErrorAlert('Lỗi tạo khóa học', message);
        },
    });

    const onSubmit = form.handleSubmit((values: CourseFormValues) => {
        createMutation.mutate(values);
    });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="mb-4 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại Dashboard
                    </Button>

                    <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Tạo khóa học mới
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        Điền thông tin cơ bản cho khóa học của bạn
                    </p>
                </div>

                {/* Form Card */}
                <Card className="p-6 md:p-8 border-zinc-200 dark:border-zinc-800">
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-6">
                            {/* Title */}
                            <FormField
                                control={form.control}
                                name="title"
                                rules={{
                                    required: 'Vui lòng nhập tên khóa học',
                                    minLength: {
                                        value: 5,
                                        message: 'Tên khóa học phải có ít nhất 5 ký tự'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Tên khóa học <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ví dụ: Khóa học TypeScript từ cơ bản đến nâng cao"
                                                className="h-12"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                rules={{
                                    required: 'Vui lòng nhập mô tả khóa học',
                                    minLength: {
                                        value: 20,
                                        message: 'Mô tả phải có ít nhất 20 ký tự'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Mô tả khóa học <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                placeholder="Mô tả chi tiết về khóa học, nội dung, đối tượng phù hợp..."
                                                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 resize-none min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Syllabus */}
                            <FormField
                                control={form.control}
                                name="syllabus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Syllabus / Mục lục môn học
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                placeholder="Nhập mục lục, mục tiêu, phạm vi kiến thức. AI Teaching Assistant sẽ chỉ trả lời trong phạm vi này."
                                                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 resize-none min-h-[160px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                            Ví dụ: Chương 1 - Giới thiệu, Chương 2 - React hooks, Chương 3 - Routing...
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Category */}
                            <FormField
                                control={form.control}
                                name="categoryId"
                                rules={{
                                    required: 'Vui lòng chọn danh mục',
                                    validate: (value) => value > 0 || 'Vui lòng chọn danh mục'
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Danh mục <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                className="w-full h-12 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            >
                                                <option value="0">Chọn danh mục</option>
                                                {categories.map((category) => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Price */}
                            <FormField
                                control={form.control}
                                name="price"
                                rules={{
                                    required: 'Vui lòng nhập giá khóa học',
                                    min: {
                                        value: 0,
                                        message: 'Giá phải lớn hơn hoặc bằng 0'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Giá (VND) <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0 (để miễn phí)"
                                                className="h-12"
                                                min="0"
                                                step="1"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                            Nhập 0 nếu khóa học miễn phí. Ví dụ: 100000, 250000, 500000
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Thumbnail Upload */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Ảnh thumbnail
                                </label>
                                {form.watch('thumbnailUrl') ? (
                                    <div className="relative w-full max-w-md">
                                        <img
                                            src={form.watch('thumbnailUrl')}
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

                            {/* Info Box */}
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Lưu ý:</strong> Sau khi tạo khóa học, bạn sẽ có thể thêm các chương (modules)
                                    và nội dung học tập (videos, documents, quizzes) trong trang quản lý khóa học.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/dashboard')}
                                    disabled={createMutation.isPending}
                                    className="flex-1 h-12 border-zinc-300 dark:border-zinc-700"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Đang tạo...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Tạo khóa học
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </Card>
            </div>
        </div>
    );
}


