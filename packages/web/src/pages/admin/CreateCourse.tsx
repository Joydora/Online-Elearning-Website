import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, X, Image } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

export default function AdminCreateCourse() {
    const navigate = useNavigate();
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

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await apiClient.post('/admin/courses', data);
        },
        onSuccess: () => {
            showSuccessAlert('Success', 'Created a new course');
            navigate('/admin/courses');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Unable to create course');
        },
    });

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showErrorAlert('Error', 'Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
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

            setFormData(prev => ({ ...prev, thumbnailUrl: data.url }));
        } catch (error) {
            showErrorAlert('Error', 'Unable to upload image');
        } finally {
            setUploading(false);
        }
    };

    const removeThumbnail = () => {
        setFormData(prev => ({ ...prev, thumbnailUrl: '' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description || !formData.categoryId || !formData.teacherId) {
            showErrorAlert('Error', 'Please fill in all details');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-3xl">
                <Button variant="ghost" onClick={() => navigate('/admin/courses')} className="mb-3 sm:mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card className="p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">Create New Course</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Course Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="Enter course title"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="Enter course description"
                                rows={5}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Price (USD)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium mb-2">Trial Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.trialDurationDays}
                                    onChange={(e) => setFormData({ ...formData, trialDurationDays: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                    placeholder="e.g. 7"
                                    min="1"
                                />
                                <p className="mt-1 text-xs text-zinc-500">Leave blank if no trial period is offered.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Access Duration (Days)</label>
                                <input
                                    type="number"
                                    value={formData.accessDurationDays}
                                    onChange={(e) => setFormData({ ...formData, accessDurationDays: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                    placeholder="Leave blank = unlimited"
                                    min="1"
                                />
                                <p className="mt-1 text-xs text-zinc-500">Example: 30 means students have 30 days of access.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                required
                            >
                                <option value={0}>Select Category</option>
                                {categories.map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Instructor</label>
                            <select
                                value={formData.teacherId}
                                onChange={(e) => setFormData({ ...formData, teacherId: Number(e.target.value) })}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700"
                                required
                            >
                                <option value={0}>Select Instructor</option>
                                {teachers.map((teacher: any) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.firstName} {teacher.lastName} (@{teacher.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Thumbnail Upload */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Thumbnail Image</label>
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

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Course'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/admin/courses')}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}


