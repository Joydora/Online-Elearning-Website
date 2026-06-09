import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
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
        mutationFn: async (userId: number) => {
            await apiClient.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Success', 'User deleted successfully');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.message || 'Could not delete user');
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

    const handleDelete = async (userId: number, username: string) => {
        const result = await showConfirmAlert(
            'Delete User',
            `Are you sure you want to delete the user account "${username}"?`
        );
        if (result.isConfirmed) {
            deleteMutation.mutate(userId);
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
                    {paginatedUsers.map((user: any) => (
                        <Card key={user.id} className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-zinc-900 dark:text-white break-words">{user.username}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 break-all">{user.email}</p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(user.id, user.username)}
                                    disabled={user.role === 'ADMIN' || deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <select
                                    value={user.role}
                                    onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                    disabled={user.role === 'ADMIN' || updateRoleMutation.isPending}
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
                    ))}
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
                                {paginatedUsers.map((user: any) => (
                                    <tr key={user.id} className="border-b">
                                        <td className="py-3 px-4">{user.username}</td>
                                        <td className="py-3 px-4">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                                disabled={user.role === 'ADMIN' || updateRoleMutation.isPending}
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
                                        <td className="py-3 px-4">
                                            {user._count?.coursesAsTeacher || 0} / {user._count?.enrollments || 0}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(user.id, user.username)}
                                                disabled={user.role === 'ADMIN' || deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
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

