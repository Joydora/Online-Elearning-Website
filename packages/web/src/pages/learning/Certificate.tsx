import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Award, ChevronLeft, Download, Loader2, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type CertificateData = {
    id: number;
    certificateCode: string;
    issuedAt: string;
    student: {
        firstName: string | null;
        lastName: string | null;
        username: string;
        email: string;
    };
    course: {
        id: number;
        title: string;
        teacher: {
            firstName: string | null;
            lastName: string | null;
            username: string;
        };
    };
    enrollment: {
        completionDate: string | null;
        progress: number;
    };
};

function displayName(user: { firstName: string | null; lastName: string | null; username: string }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
}

export default function Certificate() {
    const { courseId } = useParams<{ courseId: string }>();

    const { data: certificate, isLoading } = useQuery<CertificateData>({
        queryKey: ['certificate', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/certificates/course/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (!certificate) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
                <Award className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
                <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Chưa có chứng chỉ</h1>
                <p className="mb-6 text-zinc-500 dark:text-zinc-400">
                    Bạn cần hoàn thành 100% khóa học để hệ thống tự động cấp chứng chỉ.
                </p>
                <Link to={`/learning/${courseId}/progress`}>
                    <Button>Quay lại tiến độ</Button>
                </Link>
            </div>
        );
    }

    const studentName = displayName(certificate.student);
    const teacherName = displayName(certificate.course.teacher);
    const completedAt = certificate.enrollment.completionDate || certificate.issuedAt;

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between print:hidden">
                <Link to={`/learning/${courseId}/progress`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Quay lại tiến độ
                    </Button>
                </Link>
                <Button onClick={() => window.print()} className="gap-2 bg-red-600 hover:bg-red-700">
                    <Download className="h-4 w-4" />
                    In / Lưu PDF
                </Button>
            </div>

            <Card className="relative overflow-hidden border-4 border-red-100 bg-white p-10 text-center shadow-xl print:border-zinc-300 print:shadow-none dark:border-red-900/40 dark:bg-zinc-950">
                <div className="absolute inset-x-0 top-0 h-2 bg-red-600" />
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                    <Award className="h-10 w-10" />
                </div>

                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-red-600">
                    Certificate of Completion
                </p>
                <h1 className="mt-4 text-4xl font-bold text-zinc-900 dark:text-white">
                    Chứng nhận hoàn thành khóa học
                </h1>

                <p className="mt-8 text-zinc-500 dark:text-zinc-400">Chứng nhận rằng</p>
                <p className="mt-3 text-4xl font-bold text-zinc-900 dark:text-white">{studentName}</p>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
                    đã hoàn thành xuất sắc khóa học
                    <span className="font-semibold text-zinc-900 dark:text-white"> {certificate.course.title}</span>
                    {' '}với tiến độ {certificate.enrollment.progress}%.
                </p>

                <div className="mt-10 grid gap-6 border-t border-zinc-200 pt-8 text-left md:grid-cols-3 dark:border-zinc-800">
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Ngày hoàn thành</p>
                        <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                            {new Date(completedAt).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Giảng viên</p>
                        <p className="mt-1 font-semibold text-zinc-900 dark:text-white">{teacherName}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Mã chứng chỉ</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                            {certificate.certificateCode}
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    Có thể xác thực tại API: /api/certificates/verify/{certificate.certificateCode}
                </div>
            </Card>
        </div>
    );
}
