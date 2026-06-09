import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';

type Category = {
    id: number;
    name: string;
};

export default function ManageCategories() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const { data: categories = [], isLoading } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/categories');
            return data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            await apiClient.post('/admin/categories', { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsAdding(false);
            setNewName('');
            showSuccessAlert('Category added successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not create category');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, name }: { id: number; name: string }) => {
            await apiClient.put(`/admin/categories/${id}`, { name });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setEditingId(null);
            showSuccessAlert('Updated successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not update category');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/admin/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            showSuccessAlert('Deleted successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not delete category');
        },
    });

    const handleDelete = async (id: number, name: string) => {
        const result = await Swal.fire({
            title: 'Confirm delete?',
            html: `Delete category <strong>"${name}"</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        });
        if (result.isConfirmed) deleteMutation.mutate(id);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin')}
                    className="mb-3 sm:mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>

                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-8">
                    Manage Categories
                </h1>

                {/* Add Form */}
                {!isAdding ? (
                    <Card className="p-3 sm:p-4 border-dashed border-2 mb-5 sm:mb-6">
                        <Button onClick={() => setIsAdding(true)} variant="ghost" className="w-full">
                            <Plus className="h-5 w-5 mr-2" />
                            Add new category
                        </Button>
                    </Card>
                ) : (
                    <Card className="p-3 sm:p-4 mb-5 sm:mb-6">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Category name..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') createMutation.mutate(newName);
                                    if (e.key === 'Escape') {
                                        setIsAdding(false);
                                        setNewName('');
                                    }
                                }}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => createMutation.mutate(newName)}
                                    disabled={!newName.trim() || createMutation.isPending}
                                    className="bg-red-600 flex-1 sm:flex-none"
                                >
                                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                                <Button onClick={() => { setIsAdding(false); setNewName(''); }} variant="outline" className="flex-1 sm:flex-none">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Categories List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <Card className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-400" />
                        </Card>
                    ) : categories.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-zinc-500">No categories found</p>
                        </Card>
                    ) : (
                        categories.map((cat) => (
                            <Card key={cat.id} className="p-3 sm:p-4">
                                {editingId === cat.id ? (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') updateMutation.mutate({ id: cat.id, name: editName });
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => updateMutation.mutate({ id: cat.id, name: editName })}
                                                disabled={!editName.trim() || updateMutation.isPending}
                                                className="bg-blue-600 flex-1 sm:flex-none"
                                            >
                                                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <Button onClick={() => setEditingId(null)} variant="outline" className="flex-1 sm:flex-none">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white break-words min-w-0">{cat.name}</span>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingId(cat.id);
                                                    setEditName(cat.name);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600"
                                                onClick={() => handleDelete(cat.id, cat.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}


