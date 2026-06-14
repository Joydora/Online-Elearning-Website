import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';

type LedgerRow = {
    id: number;
    paymentId: number;
    courseId: number;
    teacherId: number;
    grossAmount: number;
    platformFee: number;
    teacherShare: number;
    payoutStatus: 'HELD' | 'PAID';
    paidAt: string | null;
    createdAt: string;
    course: { id: number; title: string; price: number } | null;
    teacher: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
    } | null;
};

type RevenueResponse = {
    rows: LedgerRow[];
    pagination: { total: number; limit: number; offset: number };
    aggregates: {
        totalGross: number;
        totalPlatformFee: number;
        totalTeacherShare: number;
        rowCount: number;
        heldCount: number;
        paidCount: number;
    };
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function toCsv(rows: LedgerRow[]): string {
    const header = [
        'ledger_id',
        'payment_id',
        'created_at',
        'course_id',
        'course_title',
        'teacher_id',
        'teacher_name',
        'gross',
        'platform_fee',
        'teacher_share',
        'payout_status',
        'paid_at',
    ];
    const escape = (s: string | number | null) => {
        const str = s === null || s === undefined ? '' : String(s);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = rows.map((r) =>
        [
            r.id,
            r.paymentId,
            r.createdAt,
            r.courseId,
            r.course?.title ?? '',
            r.teacherId,
            [r.teacher?.firstName, r.teacher?.lastName].filter(Boolean).join(' ') || r.teacher?.username || '',
            r.grossAmount,
            r.platformFee,
            r.teacherShare,
            r.payoutStatus,
            r.paidAt ?? '',
        ]
            .map(escape)
            .join(','),
    );
    return [header.join(','), ...lines].join('\n');
}

export default function AdminRevenue() {
    const queryClient = useQueryClient();
    const [teacherId, setTeacherId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [statusFilter, setStatusFilter] = useState<'' | 'HELD' | 'PAID'>('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const filterKey = useMemo(
        () => ({ teacherId, courseId, statusFilter, from, to }),
        [teacherId, courseId, statusFilter, from, to],
    );

    const { data, isLoading } = useQuery<RevenueResponse>({
        queryKey: ['admin-revenue', filterKey],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (teacherId) params.set('teacherId', teacherId);
            if (courseId) params.set('courseId', courseId);
            if (statusFilter) params.set('status', statusFilter);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const { data } = await apiClient.get(`/admin/revenue?${params.toString()}`);
            return data;
        },
    });

    const markPaid = useMutation({
        mutationFn: async (ledgerId: number) => {
            const { data } = await apiClient.post(`/admin/revenue/${ledgerId}/mark-paid`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-revenue'] });
            showSuccessAlert('Đã đánh dấu đã thanh toán');
        },
        onError: (error: any) => {
            showErrorAlert('Không thể đánh dấu', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    const downloadCsv = () => {
        if (!data?.rows.length) {
            showErrorAlert('Không có dữ liệu', 'Không có bản ghi nào để xuất.');
            return;
        }
        const csv = toCsv(data.rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const agg = data?.aggregates;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Quản lý doanh thu
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Theo dõi các khoản thu, chia doanh thu và trạng thái chi trả cho giảng viên.
                    </p>
                </div>

                {/* Aggregate cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="revenue-aggregates">
                    <Card className="p-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Tổng doanh thu</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {formatCurrency(agg?.totalGross ?? 0)}
                        </div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Platform fee</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(agg?.totalPlatformFee ?? 0)}
                        </div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Teacher share</div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {formatCurrency(agg?.totalTeacherShare ?? 0)}
                        </div>
                    </Card>
                    <Card className="p-5">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Đang giữ (HELD)</div>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                            {agg?.heldCount ?? 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            đã chi trả: {agg?.paidCount ?? 0}
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <Input
                            data-testid="filter-teacher-id"
                            placeholder="Teacher ID"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                        />
                        <Input
                            data-testid="filter-course-id"
                            placeholder="Course ID"
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                        />
                        <select
                            data-testid="filter-status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as '' | 'HELD' | 'PAID')}
                            className="h-10 px-3 rounded-md border border-input bg-background"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="HELD">Đang giữ</option>
                            <option value="PAID">Đã chi trả</option>
                        </select>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        <Button onClick={downloadCsv} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Xuất CSV
                        </Button>
                    </div>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-900">
                                <tr className="text-left">
                                    <th className="px-4 py-3 font-semibold">ID</th>
                                    <th className="px-4 py-3 font-semibold">Ngày</th>
                                    <th className="px-4 py-3 font-semibold">Khóa học</th>
                                    <th className="px-4 py-3 font-semibold">Giảng viên</th>
                                    <th className="px-4 py-3 font-semibold text-right">Gross</th>
                                    <th className="px-4 py-3 font-semibold text-right">Fee</th>
                                    <th className="px-4 py-3 font-semibold text-right">Share</th>
                                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                                    <th className="px-4 py-3 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                            Đang tải...
                                        </td>
                                    </tr>
                                )}
                                {!isLoading && data?.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            Không có bản ghi phù hợp bộ lọc.
                                        </td>
                                    </tr>
                                )}
                                {data?.rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        data-testid={`ledger-row-${row.id}`}
                                        className="border-t border-gray-200 dark:border-gray-800"
                                    >
                                        <td className="px-4 py-3">{row.id}</td>
                                        <td className="px-4 py-3">
                                            {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={row.course?.title ?? ''}>
                                            {row.course?.title ?? `#${row.courseId}`}
                                        </td>
                                        <td className="px-4 py-3">
                                            {[row.teacher?.firstName, row.teacher?.lastName]
                                                .filter(Boolean)
                                                .join(' ') ||
                                                row.teacher?.username ||
                                                `#${row.teacherId}`}
                                        </td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.grossAmount)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(row.platformFee)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                                            {formatCurrency(row.teacherShare)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {row.payoutStatus === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Đã chi
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                    <DollarSign className="h-3 w-3" />
                                                    Đang giữ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {row.payoutStatus === 'HELD' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    data-testid={`mark-paid-${row.id}`}
                                                    onClick={() => markPaid.mutate(row.id)}
                                                    disabled={markPaid.isPending}
                                                >
                                                    Đánh dấu đã chi
                                                </Button>
                                            )}
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
