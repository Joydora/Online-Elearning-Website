import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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
    price: number;
    categoryId: number;
    trialDurationDays: number | null;
    accessDurationDays: number | null;
};

export default function CreateCourse() {
    const navigate = useNavigate();

    const form = useForm<CourseFormValues>({
        defaultValues: {
            title: '',
            description: '',
            price: 0,
            categoryId: 0,
            trialDurationDays: null,
            accessDurationDays: null,
        },
    });

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
            const { data } = await apiClient.post('/courses', values);
            return data;
        },
        onSuccess: async (data) => {
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="mb-4 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại Dashboard
                    </Button>

                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Tạo khóa học mới
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Điền thông tin cơ bản cho khóa học của bạn
                    </p>
                </div>

                {/* Form Card */}
                <Card className="p-6 md:p-8 border-gray-200 dark:border-gray-800">
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
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
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
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
                                            Mô tả khóa học <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                placeholder="Mô tả chi tiết về khóa học, nội dung, đối tượng phù hợp..."
                                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 resize-none min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
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
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
                                            Danh mục <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
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
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
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
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Nhập 0 nếu khóa học miễn phí. Ví dụ: 100000, 250000, 500000
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Trial duration */}
                            <FormField
                                control={form.control}
                                name="trialDurationDays"
                                rules={{
                                    validate: (value) =>
                                        value === null ||
                                        value === undefined ||
                                        (Number.isInteger(value) && value > 0) ||
                                        'Thời hạn học thử phải là số nguyên dương',
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
                                            Thời hạn học thử (ngày)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                data-testid="trial-duration-input"
                                                type="number"
                                                placeholder="Bỏ trống nếu không cho học thử"
                                                className="h-12"
                                                min="1"
                                                step="1"
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    field.onChange(raw === '' ? null : parseInt(raw, 10));
                                                }}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Để trống: không cho học thử. VD: 7, 14, 30.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Access duration */}
                            <FormField
                                control={form.control}
                                name="accessDurationDays"
                                rules={{
                                    validate: (value) =>
                                        value === null ||
                                        value === undefined ||
                                        (Number.isInteger(value) && value > 0) ||
                                        'Thời hạn truy cập phải là số nguyên dương',
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-700 dark:text-gray-300">
                                            Thời hạn truy cập sau khi mua (ngày)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                data-testid="access-duration-input"
                                                type="number"
                                                placeholder="Bỏ trống = truy cập trọn đời"
                                                className="h-12"
                                                min="1"
                                                step="1"
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    field.onChange(raw === '' ? null : parseInt(raw, 10));
                                                }}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Bỏ trống: truy cập trọn đời. VD: 30, 90, 365.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                    className="flex-1 h-12 border-gray-300 dark:border-gray-700"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 h-12 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg shadow-red-500/30"
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

