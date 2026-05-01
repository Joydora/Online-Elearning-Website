import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

type AdminCourse = {
    id: number;
    title: string;
    description: string;
    status: CourseStatus;
    submittedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    teacher: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        email?: string;
    };
    category: { name: string };
    _count: { modules: number; enrollments: number };
};

const STATUS_LABELS: Record<CourseStatus, string> = {
    DRAFT: 'Bản nháp',
    PENDING_REVIEW: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    PUBLISHED: 'Đã xuất bản',
};

function StatusBadge({ status }: { status: CourseStatus }) {
    const colors: Record<CourseStatus, string> = {
        DRAFT: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
        PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    };
    return (
        <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}
        >
            {STATUS_LABELS[status]}
        </span>
    );
}

function formatDate(value: string | null) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('vi-VN');
    } catch {
        return value;
    }
}

export default function ReviewCourses() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'pending' | 'all'>('pending');
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const pendingQuery = useQuery<AdminCourse[]>({
        queryKey: ['admin-review-pending'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/courses/review');
            return data;
        },
        enabled: tab === 'pending',
    });

    const allQuery = useQuery<AdminCourse[]>({
        queryKey: ['admin-review-all'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/courses/all');
            return data;
        },
        enabled: tab === 'all',
    });

    const approveMutation = useMutation({
        mutationFn: async (courseId: number) => {
            await apiClient.post(`/admin/courses/${courseId}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-review-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-review-all'] });
            showSuccessAlert('Đã duyệt', 'Khoá học đã được xuất bản.');
        },
        onError: (error: any) => {
            showErrorAlert(
                'Lỗi duyệt khoá học',
                error.response?.data?.error || 'Đã có lỗi xảy ra',
            );
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ courseId, reason }: { courseId: number; reason: string }) => {
            await apiClient.post(`/admin/courses/${courseId}/reject`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-review-pending'] });
            queryClient.invalidateQueries({ queryKey: ['admin-review-all'] });
            setRejectingId(null);
            setRejectReason('');
            showSuccessAlert('Đã từ chối', 'Đã thông báo cho giảng viên qua email.');
        },
        onError: (error: any) => {
            showErrorAlert(
                'Lỗi từ chối khoá học',
                error.response?.data?.error || 'Đã có lỗi xảy ra',
            );
        },
    });

    const handleReject = (courseId: number) => {
        if (!rejectReason.trim()) {
            showErrorAlert('Thiếu lý do', 'Vui lòng nhập lý do từ chối.');
            return;
        }
        rejectMutation.mutate({ courseId, reason: rejectReason.trim() });
    };

    const courses = tab === 'pending' ? pendingQuery.data ?? [] : allQuery.data ?? [];
    const isLoading =
        tab === 'pending' ? pendingQuery.isLoading : allQuery.isLoading;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="container mx-auto max-w-6xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại Admin
                </Button>

                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
                    Duyệt khoá học
                </h1>

                {/* Tabs */}
                <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setTab('pending')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                            tab === 'pending'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                        Chờ duyệt
                        {pendingQuery.data && (
                            <span className="ml-2 inline-block rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                                {pendingQuery.data.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('all')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                            tab === 'all'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                        Tất cả khoá học
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    </div>
                ) : courses.length === 0 ? (
                    <Card className="p-12 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400">
                            {tab === 'pending'
                                ? 'Không có khoá học nào đang chờ duyệt.'
                                : 'Chưa có khoá học nào.'}
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {courses.map((course) => (
                            <Card key={course.id} className="p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                                {course.title}
                                            </h3>
                                            <StatusBadge status={course.status} />
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                            Giảng viên:{' '}
                                            <span className="font-medium">
                                                {course.teacher.firstName ?? ''}{' '}
                                                {course.teacher.lastName ?? ''}
                                            </span>{' '}
                                            ({course.teacher.username})
                                            {course.teacher.email && (
                                                <> • {course.teacher.email}</>
                                            )}
                                        </p>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            Danh mục: {course.category?.name ?? '-'} •{' '}
                                            {course._count.modules} chương •{' '}
                                            {course._count.enrollments} học viên
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                            {course.submittedAt
                                                ? `Gửi duyệt: ${formatDate(course.submittedAt)}`
                                                : `Tạo: ${formatDate(course.createdAt)}`}
                                        </p>
                                        {course.status === 'REJECTED' && course.rejectionReason && (
                                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                                                <strong>Lý do từ chối:</strong> {course.rejectionReason}
                                            </div>
                                        )}
                                    </div>

                                    {course.status === 'PENDING_REVIEW' && (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => approveMutation.mutate(course.id)}
                                                    disabled={
                                                        approveMutation.isPending &&
                                                        approveMutation.variables === course.id
                                                    }
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Duyệt
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setRejectingId(
                                                            rejectingId === course.id ? null : course.id,
                                                        );
                                                        setRejectReason('');
                                                    }}
                                                    variant="outline"
                                                    className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Từ chối
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {rejectingId === course.id && (
                                    <div className="mt-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                                        <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                            Lý do từ chối
                                        </label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            rows={4}
                                            placeholder="Nhập lý do từ chối khoá học..."
                                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                        />
                                        <div className="mt-3 flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setRejectingId(null);
                                                    setRejectReason('');
                                                }}
                                            >
                                                Huỷ
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(course.id)}
                                                disabled={rejectMutation.isPending}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                {rejectMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : null}
                                                Gửi từ chối
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
