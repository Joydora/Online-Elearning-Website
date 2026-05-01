import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Download, CheckSquare } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';

type LedgerEntry = {
    id: number;
    courseTitle: string;
    teacherName: string;
    teacherEmail: string;
    platformFee: number;
    teacherAmount: number;
    payoutStatus: 'HELD' | 'PAID';
    createdAt: string;
};

type RevenueSummary = {
    totalPlatformRevenue: number;
    totalTeacherPayouts: number;
    heldAmount: number;
};

export default function AdminRevenue() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'HELD' | 'PAID'>('ALL');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data, isLoading } = useQuery<{ entries: LedgerEntry[]; summary: RevenueSummary; total: number }>({
        queryKey: ['admin-revenue', statusFilter],
        queryFn: async () => {
            const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const { data } = await apiClient.get(`/admin/revenue${params}`);
            return data;
        },
    });

    const payoutMutation = useMutation({
        mutationFn: async (ids: number[]) => {
            await apiClient.post('/admin/revenue/payout', { ids });
        },
        onSuccess: async () => {
            await showSuccessAlert('Thành công', 'Đã đánh dấu thanh toán thành công.');
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['admin-revenue'] });
        },
        onError: () => showErrorAlert('Lỗi', 'Không thể cập nhật trạng thái thanh toán.'),
    });

    const handleExport = async () => {
        try {
            const response = await apiClient.get('/admin/revenue/export', { responseType: 'blob' });
            const url = URL.createObjectURL(response.data as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'revenue.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showErrorAlert('Lỗi', 'Không thể xuất CSV.');
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAllHeld = () => {
        const heldIds = (data?.entries ?? []).filter(e => e.payoutStatus === 'HELD').map(e => e.id);
        setSelectedIds(prev => prev.length === heldIds.length ? [] : heldIds);
    };

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-red-600" />
                    Quản lý doanh thu
                </h1>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Xuất CSV
                </Button>
            </div>

            {/* Summary cards */}
            {data?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Doanh thu nền tảng', value: data.summary.totalPlatformRevenue, color: 'text-blue-600' },
                        { label: 'Đã thanh toán GV', value: data.summary.totalTeacherPayouts, color: 'text-green-600' },
                        { label: 'Đang giữ', value: data.summary.heldAmount, color: 'text-yellow-600' },
                    ].map(({ label, value, color }) => (
                        <Card key={label} className="p-5">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
                            <p className={`text-2xl font-bold ${color} mt-1`}>{fmt(value)}</p>
                        </Card>
                    ))}
                </div>
            )}

            {/* Filters + bulk action */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                {(['ALL', 'HELD', 'PAID'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setSelectedIds([]); }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${statusFilter === s ? 'bg-red-600 text-white border-red-600' : 'border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                        {s === 'ALL' ? 'Tất cả' : s === 'HELD' ? 'Đang giữ' : 'Đã TT'}
                    </button>
                ))}
                {selectedIds.length > 0 && (
                    <Button
                        size="sm"
                        onClick={() => payoutMutation.mutate(selectedIds)}
                        disabled={payoutMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 ml-auto gap-2"
                    >
                        <CheckSquare className="w-4 h-4" />
                        Đánh dấu TT ({selectedIds.length})
                    </Button>
                )}
                {(data?.entries ?? []).some(e => e.payoutStatus === 'HELD') && (
                    <button onClick={selectAllHeld} className="text-sm text-red-600 hover:underline ml-auto">
                        {selectedIds.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả HELD'}
                    </button>
                )}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Đang tải...</div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <tr>
                                <th className="py-3 px-4 text-left w-8"></th>
                                <th className="py-3 px-4 text-left">Khóa học</th>
                                <th className="py-3 px-4 text-left">Giảng viên</th>
                                <th className="py-3 px-4 text-right">Nền tảng</th>
                                <th className="py-3 px-4 text-right">Giảng viên</th>
                                <th className="py-3 px-4 text-center">Trạng thái</th>
                                <th className="py-3 px-4 text-left">Ngày</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {(data?.entries ?? []).map(entry => (
                                <tr key={entry.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="py-3 px-4">
                                        {entry.payoutStatus === 'HELD' && (
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(entry.id)}
                                                onChange={() => toggleSelect(entry.id)}
                                                className="rounded"
                                            />
                                        )}
                                    </td>
                                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white max-w-xs truncate">
                                        {entry.courseTitle}
                                    </td>
                                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                                        <div>{entry.teacherName}</div>
                                        <div className="text-xs text-zinc-400">{entry.teacherEmail}</div>
                                    </td>
                                    <td className="py-3 px-4 text-right text-blue-600 font-medium">{fmt(entry.platformFee)}</td>
                                    <td className="py-3 px-4 text-right text-green-600 font-medium">{fmt(entry.teacherAmount)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${entry.payoutStatus === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {entry.payoutStatus === 'PAID' ? 'Đã TT' : 'Đang giữ'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-xs">
                                        {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            ))}
                            {(data?.entries ?? []).length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-500">Chưa có dữ liệu doanh thu</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
