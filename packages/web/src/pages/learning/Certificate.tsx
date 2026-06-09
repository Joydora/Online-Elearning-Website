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
                <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">No Certificate Yet</h1>
                <p className="mb-6 text-zinc-500 dark:text-zinc-400">
                    You need to complete 100% of the course for the system to automatically issue a certificate.
                </p>
                <Link to={`/learning/${courseId}/progress`}>
                    <Button>Back to Progress</Button>
                </Link>
            </div>
        );
    }

    const studentName = displayName(certificate.student);
    const teacherName = displayName(certificate.course.teacher);
    const completedAt = certificate.enrollment.completionDate || certificate.issuedAt;

    return (
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8">
            <div className="mb-4 sm:mb-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <Link to={`/learning/${courseId}/progress`} className="self-start sm:self-auto">
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Progress
                    </Button>
                </Link>
                <Button onClick={() => window.print()} className="gap-2 bg-red-600 hover:bg-red-700 w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    Print / Save PDF
                </Button>
            </div>

            <Card className="relative overflow-hidden border-4 border-red-100 bg-white p-5 sm:p-8 lg:p-10 text-center shadow-xl print:border-zinc-300 print:shadow-none dark:border-red-900/40 dark:bg-zinc-950">
                <div className="absolute inset-x-0 top-0 h-2 bg-red-600" />
                <div className="mx-auto mb-5 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                    <Award className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>

                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-red-600">
                    Certificate of Completion
                </p>
                <h1 className="mt-3 sm:mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white">
                    Certificate of Course Completion
                </h1>

                <p className="mt-6 sm:mt-8 text-zinc-500 dark:text-zinc-400">This is to certify that</p>
                <p className="mt-2 sm:mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-white break-words">{studentName}</p>
                <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-sm sm:text-base lg:text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
                    has successfully completed the course
                    <span className="font-semibold text-zinc-900 dark:text-white"> {certificate.course.title}</span>
                    {' '}with progress of {certificate.enrollment.progress}%.
                </p>

                <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 border-t border-zinc-200 pt-6 sm:pt-8 text-left sm:grid-cols-3 dark:border-zinc-800">
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Completion Date</p>
                        <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                            {new Date(completedAt).toLocaleDateString('en-US')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Instructor</p>
                        <p className="mt-1 font-semibold text-zinc-900 dark:text-white break-words">{teacherName}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-zinc-400">Certificate Code</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 dark:text-white break-all">
                            {certificate.certificateCode}
                        </p>
                    </div>
                </div>

                <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 break-all">
                    <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Can be verified at API: /api/certificates/verify/{certificate.certificateCode}</span>
                </div>
            </Card>
        </div>
    );
}
