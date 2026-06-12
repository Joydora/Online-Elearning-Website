import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, ShieldAlert, Unlock } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import { Pagination } from '../../components/ui/Pagination';

export default function ManageUsers() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    const { data: users = [] } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users');
            return data;
        },
    });

    const totalPages = Math.ceil(users.length / usersPerPage);
    const paginatedUsers = users.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

    const deleteMutation = useMutation({
        mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
            await apiClient.delete(`/admin/users/${userId}`, { params: { reason } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Success', 'Account locked successfully');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.message || 'Could not lock account');
        },
    });

    const restoreMutation = useMutation({
        mutationFn: async (userId: number) => {
            await apiClient.post(`/admin/users/${userId}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Success', 'Account restored successfully');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.message || 'Could not restore account');
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
            await apiClient.put(`/admin/users/${userId}/role`, { role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Success', 'User role updated successfully');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.message || 'Could not update user role');
        },
    });

    const getRemainingDays = (deletedAtStr: string) => {
        const deletedAt = new Date(deletedAtStr);
        const targetDate = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffTime = targetDate.getTime() - now.getTime();
        if (diffTime <= 0) return '0 days';
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days`;
    };

    const handleDelete = async (userId: number, username: string) => {
        const isDark = document.documentElement.classList.contains('dark');
        const { value: reason, isConfirmed } = await Swal.fire({
            title: 'Lock Account',
            html: `Are you sure you want to lock the account <strong>"${username}"</strong>?<br/>The account will be in pending deletion status for 7 days.`,
            icon: 'warning',
            input: 'text',
            inputPlaceholder: 'Enter lock reason...',
            inputValidator: (value) => {
                if (!value) {
                    return 'You must enter a reason!';
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Lock',
            cancelButtonText: 'Cancel',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: isDark ? '#64748b' : '#94a3b8',
        });

        if (isConfirmed && reason) {
            deleteMutation.mutate({ userId, reason });
        }
    };

    const handleRestore = async (userId: number, username: string) => {
        const isDark = document.documentElement.classList.contains('dark');
        const result = await Swal.fire({
            title: 'Restore Account',
            text: `Do you want to restore the account "${username}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Restore',
            cancelButtonText: 'Cancel',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: isDark ? '#64748b' : '#94a3b8',
        });

        if (result.isConfirmed) {
            restoreMutation.mutate(userId);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-6xl">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-3 sm:mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold mb-5 sm:mb-8 text-zinc-900 dark:text-white">Manage Users</h1>

                {/* Mobile card view */}
                <div className="md:hidden space-y-3">
                    {paginatedUsers.map((user: any) => {
                        const isDeleted = !!user.deletedAt;
                        return (
                            <Card key={user.id} className={`p-4 ${isDeleted ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/10' : ''}`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-zinc-900 dark:text-white break-words">{user.username}</p>
                                            {isDeleted && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Pending Deletion ({getRemainingDays(user.deletedAt)})
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 break-all">{user.email}</p>
                                        {isDeleted && (
                                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 italic">
                                                Reason: {user.deletionReason}
                                            </p>
                                        )}
                                    </div>
                                    {isDeleted ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 shrink-0"
                                            onClick={() => handleRestore(user.id, user.username)}
                                            disabled={restoreMutation.isPending}
                                        >
                                            <Unlock className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(user.id, user.username)}
                                            disabled={user.role === 'ADMIN' || deleteMutation.isPending}
                                            className="shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <select
                                        value={user.role}
                                        onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                        disabled={user.role === 'ADMIN' || updateRoleMutation.isPending || isDeleted}
                                        className={`px-3 py-1 text-xs rounded-full border-2 ${user.role === 'ADMIN'
                                                ? 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed'
                                                : user.role === 'TEACHER'
                                                    ? 'bg-green-100 text-green-800 border-green-300'
                                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                            }`}
                                    >
                                        <option value="STUDENT">STUDENT</option>
                                        <option value="TEACHER">TEACHER</option>
                                        <option value="ADMIN" disabled>ADMIN</option>
                                    </select>
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                        Courses: {user._count?.coursesAsTeacher || 0} / Enrollments: {user._count?.enrollments || 0}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Desktop table */}
                <Card className="p-4 sm:p-6 hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4">Username</th>
                                    <th className="text-left py-3 px-4">Email</th>
                                    <th className="text-left py-3 px-4">Role</th>
                                    <th className="text-left py-3 px-4">Courses/Enrollments</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map((user: any) => {
                                    const isDeleted = !!user.deletedAt;
                                    return (
                                        <tr key={user.id} className={`border-b hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${isDeleted ? 'bg-red-50/25 dark:bg-red-950/10' : ''}`}>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{user.username}</span>
                                                        {isDeleted && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 animate-pulse">
                                                                <ShieldAlert className="w-3 h-3" />
                                                                Pending Deletion ({getRemainingDays(user.deletedAt)})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isDeleted && (
                                                        <span className="text-[11px] text-red-500 mt-0.5 flex items-center gap-1 font-medium">
                                                            Reason: {user.deletionReason}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                                    disabled={user.role === 'ADMIN' || updateRoleMutation.isPending || isDeleted}
                                                    className={`px-3 py-1 text-xs rounded-full border-2 ${user.role === 'ADMIN'
                                                            ? 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed'
                                                            : user.role === 'TEACHER'
                                                                ? 'bg-green-100 text-green-800 border-green-300 cursor-pointer hover:border-green-500'
                                                                : 'bg-blue-100 text-blue-800 border-blue-300 cursor-pointer hover:border-blue-500'
                                                        }`}
                                                >
                                                    <option value="STUDENT">STUDENT</option>
                                                    <option value="TEACHER">TEACHER</option>
                                                    <option value="ADMIN" disabled>ADMIN</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                                                {user._count?.coursesAsTeacher || 0} / {user._count?.enrollments || 0}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isDeleted ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRestore(user.id, user.username)}
                                                        disabled={restoreMutation.isPending}
                                                        className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 font-medium"
                                                    >
                                                        <Unlock className="h-4 w-4" /> Restore
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(user.id, user.username)}
                                                        disabled={user.role === 'ADMIN' || deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            </div>
        </div>
    );
}

