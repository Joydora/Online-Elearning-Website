import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Tag, Calendar, Percent, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';
import { AddPromotionModal } from '../../components/AddPromotionModal';

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

export default function ManagePromotions() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

    // Fetch promotions
    const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
        queryKey: ['promotions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/promotions');
            return data;
        },
    });

    // Delete promotion mutation
    const deleteMutation = useMutation({
        mutationFn: async (promotionId: number) => {
            await apiClient.delete(`/promotions/${promotionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            showSuccessAlert('Deleted successfully!', 'The promotion code has been deleted.');
        },
        onError: (error: any) => {
            showErrorAlert('Error!', error.response?.data?.error || 'Could not delete promotion code.');
        },
    });

    const handleDelete = async (promotion: Promotion) => {
        const result = await Swal.fire({
            title: 'Confirm Delete?',
            html: `Are you sure you want to delete the promotion code <strong>"${promotion.code}"</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            deleteMutation.mutate(promotion.id);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isActive = (promotion: Promotion) => {
        const now = new Date();
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        return promotion.isActive && now >= startDate && now <= endDate;
    };

    const formatDiscount = (promotion: Promotion) => {
        if (promotion.discountType === 'PERCENTAGE') {
            return `${promotion.discountValue}%`;
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(promotion.discountValue);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-6 sm:py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
                {/* Header */}
                <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                            Manage Promotion Codes
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            Create and manage promotion codes for courses
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingPromotion(null);
                            setIsAddModalOpen(true);
                        }}
                        className="gap-2 bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Create Promotion
                    </Button>
                </div>

                {/* Promotions List */}
                {promotions.length === 0 ? (
                    <Card className="p-8 sm:p-12 text-center">
                        <Tag className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 text-zinc-400" />
                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                            No promotions found
                        </h3>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-4">
                            Create your first promotion code to get started.
                        </p>
                        <Button
                            onClick={() => {
                                setEditingPromotion(null);
                                setIsAddModalOpen(true);
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Promotion
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {promotions.map((promotion) => (
                            <Card
                                key={promotion.id}
                                className={`p-4 sm:p-6 border-2 ${isActive(promotion)
                                        ? 'border-green-500 dark:border-green-400 bg-green-50/50 dark:bg-green-950/20'
                                        : 'border-zinc-200 dark:border-zinc-800'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Tag className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                                            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white break-all">
                                                {promotion.code}
                                            </h3>
                                            {isActive(promotion) ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-zinc-400 shrink-0" />
                                            )}
                                        </div>
                                        {promotion.description && (
                                            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2 break-words">
                                                {promotion.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        {promotion.discountType === 'PERCENTAGE' ? (
                                            <Percent className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <DollarSign className="w-4 h-4 text-blue-600" />
                                        )}
                                        <span className="text-zinc-600 dark:text-zinc-400">Discount:</span>
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                            {formatDiscount(promotion)}
                                        </span>
                                    </div>

                                    {promotion.minPurchaseAmount && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <span>Min Purchase:</span>
                                            <span className="font-medium">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD',
                                                }).format(promotion.minPurchaseAmount)}
                                            </span>
                                        </div>
                                    )}

                                    {promotion.maxDiscountAmount && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <span>Max Discount:</span>
                                            <span className="font-medium">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: 'USD',
                                                }).format(promotion.maxDiscountAmount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        <Users className="w-4 h-4" />
                                        <span>
                                            Used: {promotion.usedCount}
                                            {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ' / ∞'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => {
                                            setEditingPromotion(promotion);
                                            setIsAddModalOpen(true);
                                        }}
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/30 dark:text-red-400"
                                        onClick={() => handleDelete(promotion)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Add/Edit Modal */}
                {isAddModalOpen && (
                    <AddPromotionModal
                        promotion={editingPromotion}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            setEditingPromotion(null);
                        }}
                        onSuccess={() => {
                            setIsAddModalOpen(false);
                            setEditingPromotion(null);
                            queryClient.invalidateQueries({ queryKey: ['promotions'] });
                        }}
                    />
                )}
            </div>
        </div>
    );
}


