import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Tag } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

type Promotion = {
    id: number;
    code: string;
    description: string | null;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usedCount: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

type AddPromotionModalProps = {
    promotion: Promotion | null;
    onClose: () => void;
    onSuccess: () => void;
};

export function AddPromotionModal({ promotion, onClose, onSuccess }: AddPromotionModalProps) {
    const isEditing = !!promotion;

    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
        discountValue: 0,
        minPurchaseAmount: '',
        maxDiscountAmount: '',
        usageLimit: '',
        startDate: '',
        endDate: '',
        isActive: true,
        courseId: '',
    });

    const { user } = useAuthStore();

    const { data: courses = [] } = useQuery<any[]>({
        queryKey: ['courses-for-promotion', user?.role],
        queryFn: async () => {
            if (user?.role === 'TEACHER') {
                const { data } = await apiClient.get('/teacher/courses');
                return data;
            } else if (user?.role === 'ADMIN') {
                const { data } = await apiClient.get('/courses');
                return data;
            }
            return [];
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (promotion) {
            setFormData({
                code: promotion.code,
                description: promotion.description || '',
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
                minPurchaseAmount: promotion.minPurchaseAmount?.toString() || '',
                maxDiscountAmount: promotion.maxDiscountAmount?.toString() || '',
                usageLimit: promotion.usageLimit?.toString() || '',
                startDate: new Date(promotion.startDate).toISOString().slice(0, 16),
                endDate: new Date(promotion.endDate).toISOString().slice(0, 16),
                isActive: promotion.isActive,
                courseId: (promotion as any).courseId?.toString() || '',
            });
        } else {
            // Set default dates for new promotion
            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            setFormData({
                ...formData,
                startDate: now.toISOString().slice(0, 16),
                endDate: nextMonth.toISOString().slice(0, 16),
                courseId: '',
            });
        }
    }, [promotion]);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiClient.post('/promotions', data);
        },
        onSuccess: () => {
            showSuccessAlert('Success!', 'Promotion code has been created.');
            onSuccess();
        },
        onError: (error: any) => {
            showErrorAlert('Error!', error.response?.data?.error || 'Could not create promotion code.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            await apiClient.put(`/promotions/${promotion!.id}`, data);
        },
        onSuccess: () => {
            showSuccessAlert('Success!', 'Promotion code has been updated.');
            onSuccess();
        },
        onError: (error: any) => {
            showErrorAlert('Error!', error.response?.data?.error || 'Could not update promotion code.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const data = {
            code: formData.code.toUpperCase(),
            description: formData.description || undefined,
            discountType: formData.discountType,
            discountValue: Number(formData.discountValue),
            minPurchaseAmount: formData.minPurchaseAmount ? Number(formData.minPurchaseAmount) : undefined,
            maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
            usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
            startDate: new Date(formData.startDate).toISOString(),
            endDate: new Date(formData.endDate).toISOString(),
            isActive: formData.isActive,
            courseId: formData.courseId ? Number(formData.courseId) : undefined,
        };

        if (isEditing) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6 flex items-center justify-between gap-3">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
                        {isEditing ? 'Edit Promotion Code' : 'Create Promotion Code'}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                    {/* Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Promotion Code *
                        </label>
                        <Input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="SUMMER2026"
                            required
                            disabled={isEditing}
                            className="uppercase"
                        />
                    </div>

                    {/* Link to Course */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Link to Course {user?.role === 'TEACHER' && '*'}
                        </label>
                        <select
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            required={user?.role === 'TEACHER'}
                        >
                            <option value="">{user?.role === 'TEACHER' ? 'Select a course...' : 'All Courses (Site-wide)'}</option>
                            {courses.map((course: any) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Promotion description..."
                            rows={3}
                        />
                    </div>

                    {/* Discount Type & Value */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Discount Type *
                            </label>
                            <select
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                required
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (USD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Discount Value *
                            </label>
                            <Input
                                type="number"
                                step={formData.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                                min="0"
                                max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                                required
                            />
                        </div>
                    </div>

                    {/* Min Purchase & Max Discount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Minimum Purchase (USD)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.minPurchaseAmount}
                                onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Maximum Discount (USD) {formData.discountType === 'PERCENTAGE' && '(for percentage)'}
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.maxDiscountAmount}
                                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Usage Limit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Usage Limit (leave empty = unlimited)
                        </label>
                        <Input
                            type="number"
                            step="1"
                            min="1"
                            value={formData.usageLimit}
                            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                            placeholder="100"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Start Date *
                            </label>
                            <Input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                End Date *
                            </label>
                            <Input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-red-600 border-zinc-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Activate promotion code
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Processing...'
                                : isEditing
                                    ? 'Update'
                                    : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


