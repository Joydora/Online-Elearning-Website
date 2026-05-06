import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Download, CheckSquare } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';

type LedgerEntry = {
    id: number;
    grossAmount: number;
    platformFee: number;
    payoutStatus: 'HELD' | 'PAID';
    teacherShare: number;
    createdAt: string;
    paidAt?: string | null;
    course: {
        id: number;
        title: string;
    };
    teacher: {
        id: number;
        username: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
    };
};

type RevenueSummary = {
    grossAmount: number;
    platformFee: number;
    teacherShare: number;
};

type RevenueResponse = {
    rows: LedgerEntry[];
    summary: RevenueSummary;
    total: number;
    page: number;
    totalPages: number;
};

type TeacherOption = {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
};

type CourseOption = {
    id: number;
    title: string;
};

export default function AdminRevenue() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'HELD' | 'PAID'>('ALL');
    const [teacherId, setTeacherId] = useState('');
    const [courseId, setCourseId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data, isLoading } = useQuery<RevenueResponse>({
        queryKey: ['admin-revenue', statusFilter, teacherId, courseId, from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.set('payoutStatus', statusFilter);
            if (teacherId) params.set('teacherId', teacherId);
            if (courseId) params.set('courseId', courseId);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const { data } = await apiClient.get(`/admin/revenue?${params.toString()}`);
            return data;
        },
    });

    const { data: teachers = [] } = useQuery<TeacherOption[]>({
        queryKey: ['admin-revenue-teachers'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/users?role=TEACHER');
            return data;
        },
    });

    const { data: courses = [] } = useQuery<CourseOption[]>({
        queryKey: ['admin-revenue-courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/courses');
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
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.set('payoutStatus', statusFilter);
            if (teacherId) params.set('teacherId', teacherId);
            if (courseId) params.set('courseId', courseId);
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const response = await apiClient.get(`/admin/revenue/export?${params.toString()}`, { responseType: 'blob' });
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
        const heldIds = (data?.rows ?? []).filter(e => e.payoutStatus === 'HELD').map(e => e.id);
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

            <Card className="p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={teacherId}
                        onChange={(e) => { setTeacherId(e.target.value); setSelectedIds([]); }}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <option value="">Tất cả giảng viên</option>
                        {teachers.map((teacher) => {
                            const name = [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || teacher.username;
                            return (
                                <option key={teacher.id} value={teacher.id}>
                                    {name}
                                </option>
                            );
                        })}
                    </select>
                    <select
                        value={courseId}
                        onChange={(e) => { setCourseId(e.target.value); setSelectedIds([]); }}
                        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <option value="">Tất cả khóa học</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setStatusFilter('ALL');
                            setTeacherId('');
                            setCourseId('');
                            setFrom('');
                            setTo('');
                            setSelectedIds([]);
                        }}
                    >
                        Xóa lọc
                    </Button>
                </div>
            </Card>

            {/* Summary cards */}
            {data?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Doanh thu nền tảng', value: data.summary.platformFee, color: 'text-blue-600' },
                        { label: 'Phần GV', value: data.summary.teacherShare, color: 'text-green-600' },
                        { label: 'Tổng doanh thu', value: data.summary.grossAmount, color: 'text-yellow-600' },
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
                {(data?.rows ?? []).some(e => e.payoutStatus === 'HELD') && (
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
                            {(data?.rows ?? []).map(entry => {
                                const teacherName = [entry.teacher.firstName, entry.teacher.lastName]
                                    .filter(Boolean)
                                    .join(' ') || entry.teacher.username;

                                return (
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
                                        {entry.course.title}
                                    </td>
                                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                                        <div>{teacherName}</div>
                                        <div className="text-xs text-zinc-400">{entry.teacher.email}</div>
                                    </td>
                                    <td className="py-3 px-4 text-right text-blue-600 font-medium">{fmt(entry.platformFee)}</td>
                                    <td className="py-3 px-4 text-right text-green-600 font-medium">{fmt(entry.teacherShare)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${entry.payoutStatus === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                            {entry.payoutStatus === 'PAID' ? 'Đã TT' : 'Đang giữ'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-xs">
                                        {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            )})}
                            {(data?.rows ?? []).length === 0 && (
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
