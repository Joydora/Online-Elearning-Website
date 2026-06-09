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
    trialDurationDays: number | null;
    accessDurationDays: number | null;
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
            trialDurationDays: null,
            accessDurationDays: null,
        },
    });

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showErrorAlert('Error', 'Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showErrorAlert('Error', 'Maximum image size is 5MB');
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
            showErrorAlert('Error', 'Unable to upload image');
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
                'Course created successfully!',
                'Your course has been created. You can now add modules and content.'
            );
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'An error occurred. Please try again.';
            showErrorAlert('Error creating course', message);
        },
    });

    const onSubmit = form.handleSubmit((values: CourseFormValues) => {
        createMutation.mutate(values);
    });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="mb-3 sm:mb-4 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Create New Course
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                        Fill in the basic information for your course
                    </p>
                </div>

                {/* Form Card */}
                <Card className="p-4 sm:p-6 md:p-8 border-zinc-200 dark:border-zinc-800">
                    <Form {...form}>
                        <form onSubmit={onSubmit} className="space-y-6">
                            {/* Title */}
                            <FormField
                                control={form.control}
                                name="title"
                                rules={{
                                    required: 'Please enter the course title',
                                    minLength: {
                                        value: 5,
                                        message: 'Course title must be at least 5 characters'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Course Title <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Example: TypeScript from Beginner to Advanced"
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
                                    required: 'Please enter the course description',
                                    minLength: {
                                        value: 20,
                                        message: 'Description must be at least 20 characters'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Course Description <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                placeholder="Detailed description of the course, content, target audience..."
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
                                            Syllabus / Course Outline
                                        </FormLabel>
                                        <FormControl>
                                            <textarea
                                                placeholder="Enter outline, objectives, and scope of knowledge. The AI Teaching Assistant will only answer within this scope."
                                                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 resize-none min-h-[160px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                            Example: Chapter 1 - Introduction, Chapter 2 - React hooks, Chapter 3 - Routing...
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
                                    required: 'Please select a category',
                                    validate: (value) => value > 0 || 'Please select a category'
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Category <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                className="w-full h-12 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            >
                                                <option value="0">Select Category</option>
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
                                    required: 'Please enter the course price',
                                    min: {
                                        value: 0,
                                        message: 'Price must be greater than or equal to 0'
                                    }
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                            Price (USD) <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0 (for Free)"
                                                className="h-12"
                                                min="0"
                                                step="0.01"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                            Enter 0 if the course is free. Example: 9.99, 19.99, 49.99
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="trialDurationDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                                Trial Duration (Days)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 7"
                                                    min="1"
                                                    className="h-12"
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                                />
                                            </FormControl>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                Leave blank if no trial period is offered.
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="accessDurationDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-zinc-700 dark:text-zinc-300">
                                                Access Duration (Days)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="Leave blank = unlimited"
                                                    min="1"
                                                    className="h-12"
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                                />
                                            </FormControl>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                Example: 30 means students have 30 days of access after purchase.
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Thumbnail Upload */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Thumbnail Image
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
                                                        <span className="font-semibold text-red-600">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-zinc-400 mt-1">PNG, JPG (max 5MB)</p>
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
                                    <strong>Note:</strong> After creating the course, you will be able to add modules and learning content (videos, documents, quizzes) in the course management page.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/dashboard')}
                                    disabled={createMutation.isPending}
                                    className="w-full sm:flex-1 h-12 border-zinc-300 dark:border-zinc-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full sm:flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-5 w-5" />
                                            Create Course
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


