import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

export default function ManageUsers() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const { data: users = [] } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users');
            return data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: number) => {
            await apiClient.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Thành công', 'Đã xóa người dùng');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.message || 'Không thể xóa người dùng');
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
            await apiClient.put(`/admin/users/${userId}/role`, { role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            showSuccessAlert('Thành công', 'Đã cập nhật quyền người dùng');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.message || 'Không thể cập nhật quyền');
        },
    });

    const handleDelete = async (userId: number, username: string) => {
        const result = await showConfirmAlert(
            'Xóa người dùng',
            `Bạn có chắc chắn muốn xóa tài khoản "${username}"?`
        );
        if (result.isConfirmed) {
            deleteMutation.mutate(userId);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
            <div className="container mx-auto max-w-6xl">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                </Button>
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Quản lý Người dùng</h1>
                <Card className="p-6">
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
                                {users.map((user: any) => (
                                    <tr key={user.id} className="border-b">
                                        <td className="py-3 px-4">{user.username}</td>
                                        <td className="py-3 px-4">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                                disabled={user.role === 'ADMIN' || updateRoleMutation.isPending}
                                                className={`px-3 py-1 text-xs rounded-full border-2 ${
                                                    user.role === 'ADMIN' 
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
            </div>
        </div>
    );
}
