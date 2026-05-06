import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type EarningEntry = {
    id: number;
    teacherShare: number;
    payoutStatus: 'HELD' | 'PAID';
    createdAt: string;
    course: {
        id: number;
        title: string;
    };
};

type EarningsResponse = {
    heldAmount: number;
    paidAmount: number;
    totalSales: number;
    recentEntries: EarningEntry[];
};

export default function TeacherEarnings() {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery<EarningsResponse>({
        queryKey: ['teacher-earnings'],
        queryFn: async () => {
            const { data } = await apiClient.get('/teacher/earnings');
            return data;
        },
    });

    const fmt = (value: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="mb-3 sm:mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại Dashboard
                </Button>

                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 shrink-0" />
                        Doanh thu được giữ
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                        Trang này chỉ để xem. Quản trị viên là người xác nhận chi trả.
                    </p>
                </div>

                {isLoading ? (
                    <Card className="p-10 text-center text-zinc-500">Đang tải...</Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
                            <Card className="p-4 sm:p-5">
                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Đang giữ</p>
                                <p className="mt-1 text-lg sm:text-2xl font-bold text-yellow-600 break-all">
                                    {fmt(data?.heldAmount ?? 0)}
                                </p>
                            </Card>
                            <Card className="p-4 sm:p-5">
                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Đã chi trả</p>
                                <p className="mt-1 text-lg sm:text-2xl font-bold text-green-600 break-all">
                                    {fmt(data?.paidAmount ?? 0)}
                                </p>
                            </Card>
                            <Card className="p-4 sm:p-5">
                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Số giao dịch</p>
                                <p className="mt-1 text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">
                                    {data?.totalSales ?? 0}
                                </p>
                            </Card>
                        </div>

                        <Card className="overflow-hidden">
                            <div className="border-b border-zinc-200 p-3 sm:p-4 dark:border-zinc-800">
                                <h2 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white">
                                    Giao dịch gần đây
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Khóa học</th>
                                            <th className="px-4 py-3 text-right">Phần giảng viên</th>
                                            <th className="px-4 py-3 text-center">Trạng thái</th>
                                            <th className="px-4 py-3 text-left">Ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {(data?.recentEntries ?? []).map((entry) => (
                                            <tr key={entry.id}>
                                                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                                                    {entry.course.title}
                                                </td>
                                                <td className="px-4 py-3 text-right text-green-600 font-medium">
                                                    {fmt(entry.teacherShare)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${entry.payoutStatus === 'PAID'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}
                                                    >
                                                        {entry.payoutStatus === 'PAID' ? 'Đã chi trả' : 'Đang giữ'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500">
                                                    {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
                                                </td>
                                            </tr>
                                        ))}
                                        {(data?.recentEntries ?? []).length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                                                    Chưa có giao dịch doanh thu.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
