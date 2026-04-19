import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    Circle,
    PlayCircle,
    FileText,
    HelpCircle,
    Code2,
    Loader2,
    BookOpen,
    Sparkles,
    Bot,
    Settings,
    ThumbsUp,
    AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert } from '../../lib/sweetalert';

type ContentType = 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';

type ContentRow = {
    contentId: number;
    title: string;
    contentType: ContentType;
    completed: boolean;
    quizScore: number | null;
    practiceScore: number | null;
};

type ModuleRow = {
    moduleId: number;
    title: string;
    contents: ContentRow[];
    completedCount: number;
    totalCount: number;
    moduleProgress: number;
};

type ProgressResponse = {
    enrollmentId: number;
    courseId: number;
    overallProgress: number;
    completedCount: number;
    totalCount: number;
    modules: ModuleRow[];
};

type SummaryResponse = {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    generatedBy: 'ai' | 'fallback';
};

type Enrollment = { id: number; courseId: number };

const TYPE_ICON: Record<ContentType, React.ReactNode> = {
    VIDEO: <PlayCircle className="h-4 w-4" />,
    DOCUMENT: <FileText className="h-4 w-4" />,
    QUIZ: <HelpCircle className="h-4 w-4" />,
    PRACTICE: <Code2 className="h-4 w-4" />,
};

export default function ProgressPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // First, find this student's enrollment id for the current course
    const { data: enrollment, isLoading: enrollLoading } = useQuery<Enrollment | null>({
        queryKey: ['enrollment', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get('/enroll/my-enrollments');
            const e = data.find((row: any) => (row.course?.id ?? row.course?.courseId) === Number(courseId));
            return e ? { id: e.id, courseId: e.courseId } : null;
        },
        enabled: !!courseId,
    });

    const {
        data: progress,
        isLoading: progressLoading,
        refetch,
    } = useQuery<ProgressResponse>({
        queryKey: ['progress', enrollment?.id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/enrollments/${enrollment!.id}/progress`);
            return data;
        },
        enabled: !!enrollment?.id,
    });

    const summary = useMutation<SummaryResponse, Error, void>({
        mutationFn: async () => {
            const { data } = await apiClient.get(`/enrollments/${enrollment!.id}/summary`);
            return data;
        },
    });

    const markComplete = useMutation({
        mutationFn: async (contentId: number) => {
            await apiClient.post(`/contents/${contentId}/complete`);
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['enrollment', courseId] });
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error ?? 'Không thể cập nhật');
        },
    });

    if (enrollLoading || progressLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!enrollment) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="p-8 text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Bạn chưa đăng ký khoá học này.</p>
                    <Link to={`/courses/${courseId}`}>
                        <Button>Xem khoá học</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-500">
                Không có dữ liệu tiến độ.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/learning/${courseId}`)} className="gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Về trang học
                    </Button>
                </div>

                <Card className="p-6 mb-4" data-testid="summary-card">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Nhận xét về tiến độ
                        </h2>
                        <Button
                            data-testid="summary-button"
                            size="sm"
                            variant="outline"
                            onClick={() => summary.mutate()}
                            disabled={summary.isPending}
                            className="gap-2"
                        >
                            {summary.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích…</>
                            ) : (
                                <>{summary.data ? 'Cập nhật nhận xét' : 'Tạo nhận xét'}</>
                            )}
                        </Button>
                    </div>

                    {!summary.data && !summary.isPending && (
                        <p className="text-sm text-slate-500">
                            Bấm nút bên trên để AI phân tích điểm mạnh / điểm cần cải thiện.
                        </p>
                    )}

                    {summary.data && (
                        <div data-testid="summary-content" className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800" data-testid="summary-source">
                                    {summary.data.generatedBy === 'ai' ? (
                                        <><Bot className="h-3 w-3" /> AI</>
                                    ) : (
                                        <><Settings className="h-3 w-3" /> Heuristic</>
                                    )}
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300">{summary.data.summary}</p>
                            {summary.data.strengths.length > 0 && (
                                <div>
                                    <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                                        <ThumbsUp className="h-4 w-4" /> Điểm mạnh
                                    </p>
                                    <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                                        {summary.data.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                            {summary.data.weaknesses.length > 0 && (
                                <div>
                                    <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
                                        <AlertTriangle className="h-4 w-4" /> Cần cải thiện
                                    </p>
                                    <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">
                                        {summary.data.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <Card className="p-6 mb-6" data-testid="overall-card">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <BookOpen className="h-7 w-7" />
                        Tiến độ học tập
                    </h1>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-slate-600 dark:text-slate-400">
                            Đã hoàn thành <strong data-testid="completed-count">{progress.completedCount}</strong> / {progress.totalCount} bài
                        </p>
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="overall-percent">
                            {progress.overallProgress}%
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${progress.overallProgress}%` }}
                        />
                    </div>
                </Card>

                <div className="space-y-4">
                    {progress.modules.map((m) => (
                        <Card key={m.moduleId} className="p-5" data-testid={`module-${m.moduleId}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{m.title}</h2>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {m.completedCount}/{m.totalCount} ({m.moduleProgress}%)
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${m.moduleProgress}%` }}
                                />
                            </div>
                            <ul className="space-y-2">
                                {m.contents.map((c) => (
                                    <li
                                        key={c.contentId}
                                        data-testid={`content-${c.contentId}`}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                                    >
                                        <span className={c.completed ? 'text-emerald-500' : 'text-slate-400'}>
                                            {c.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400">{TYPE_ICON[c.contentType]}</span>
                                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {c.title}
                                        </span>
                                        {c.quizScore !== null && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                Quiz: {c.quizScore.toFixed(0)}%
                                            </span>
                                        )}
                                        {c.practiceScore !== null && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                                Practice: {c.practiceScore.toFixed(1)}/10
                                            </span>
                                        )}
                                        {(c.contentType === 'VIDEO' || c.contentType === 'DOCUMENT') && !c.completed && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`mark-${c.contentId}`}
                                                disabled={markComplete.isPending}
                                                onClick={() => markComplete.mutate(c.contentId)}
                                            >
                                                Đánh dấu xong
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
