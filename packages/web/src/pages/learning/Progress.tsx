import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Award, ChevronLeft, CheckCircle, Circle, Sparkles, Loader2, BookOpen, Target, Clock } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert } from '../../lib/sweetalert';

type ContentDetail = {
    id: number;
    title: string;
    contentType: string;
    completed: boolean;
    completedAt: string | null;
    watchedSeconds: number | null;
    quizScore: number | null;
    practiceScore: { score: number; passed: boolean } | null;
};

type ModuleDetail = {
    id: number;
    title: string;
    contents: ContentDetail[];
};

type ProgressDetail = {
    enrollmentId: number;
    progress: number;
    completionDate: string | null;
    type: string;
    expiresAt: string | null;
    isActive: boolean;
    modules: ModuleDetail[];
};

const TYPE_LABEL: Record<string, string> = {
    VIDEO: 'Video',
    DOCUMENT: 'Document',
    QUIZ: 'Quiz',
    PRACTICE: 'Practice',
    ASSIGNMENT: 'Assignment',
};

function fmtSeconds(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function Progress() {
    const { courseId } = useParams<{ courseId: string }>();
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});

    const { data: detail, isLoading } = useQuery<ProgressDetail>({
        queryKey: ['progress-detail', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/progress/course/${courseId}/detail`);
            return data;
        },
        enabled: !!courseId,
    });

    const summaryMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.get<{ summary: string }>(`/progress/course/${courseId}/summary`);
            return data.summary;
        },
        onSuccess: (s) => setAiSummary(s),
        onError: () => showErrorAlert('Error', 'Could not load AI summary'),
    });

    const toggleModule = (id: number) => setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <p className="text-red-500 mb-4">Progress information not found</p>
                <Link to="/my-courses"><Button>Back to My Courses</Button></Link>
            </div>
        );
    }

    const allContents = detail.modules.flatMap(m => m.contents);
    const completedCount = allContents.filter(c => c.completed).length;
    const totalCount = allContents.length;

    return (
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
                <Link to={`/learning/${courseId}`} className="self-start">
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Learning
                    </Button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Learning Progress</h1>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card className="p-3 sm:p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-red-600">{detail.progress}%</p>
                    <p className="text-xs text-zinc-500 mt-1">Overall Progress</p>
                </Card>
                <Card className="p-3 sm:p-4 text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">{completedCount}/{totalCount}</p>
                    <p className="text-xs text-zinc-500 mt-1">Lessons Completed</p>
                </Card>
                <Card className="p-3 sm:p-4 text-center">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                        {detail.type === 'TRIAL' ? 'Trial' : detail.type === 'PAID' ? 'Purchased' : 'Free'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Subscription Type</p>
                </Card>
                <Card className="p-3 sm:p-4 text-center">
                    {detail.completionDate ? (
                        <>
                            <p className="text-sm font-semibold text-green-600">
                                {new Date(detail.completionDate).toLocaleDateString('en-US')}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">Completion Date</p>
                        </>
                    ) : detail.expiresAt ? (
                        <>
                            <p className="text-sm font-semibold text-yellow-600">
                                {new Date(detail.expiresAt).toLocaleDateString('en-US')}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">Expiration</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-zinc-500">—</p>
                            <p className="text-xs text-zinc-500 mt-1">Unlimited</p>
                        </>
                    )}
                </Card>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-1.5">
                    <span>Completion Progress</span>
                    <span>{detail.progress}%</span>
                </div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${detail.progress}%` }}
                    />
                </div>
            </div>

            {/* AI Summary */}
            {detail.progress >= 100 && (
                <Card className="p-4 sm:p-5 mb-6 border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <Award className="mt-0.5 h-6 w-6 text-green-600 shrink-0" />
                            <div>
                                <h2 className="font-semibold text-green-900 dark:text-green-200">
                                    Certificate is ready
                                </h2>
                                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                    You have completed the course. The system has automatically issued your certificate of completion.
                                </p>
                            </div>
                        </div>
                        <Link to={`/learning/${courseId}/certificate`} className="md:shrink-0">
                            <Button className="bg-green-600 hover:bg-green-700 gap-2 w-full md:w-auto">
                                <Award className="h-4 w-4" />
                                View Certificate
                            </Button>
                        </Link>
                    </div>
                </Card>
            )}

            {/* AI Summary */}
            <Card className="p-4 sm:p-5 mb-6 border-dashed border-red-300 dark:border-red-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-red-500" />
                        <h2 className="font-semibold text-zinc-900 dark:text-white">AI Review</h2>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => summaryMutation.mutate()}
                        disabled={summaryMutation.isPending}
                        variant="outline"
                        className="gap-1 text-xs w-full sm:w-auto"
                    >
                        {summaryMutation.isPending ? (
                            <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</>
                        ) : (
                            <><Sparkles className="w-3 h-3" />{aiSummary ? 'Update' : 'Get Review'}</>
                        )}
                    </Button>
                </div>
                {aiSummary ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiSummary}</p>
                ) : (
                    <p className="text-sm text-zinc-500">Click the button to have AI analyze your strengths and areas for improvement.</p>
                )}
            </Card>

            {/* Module breakdown */}
            <div className="space-y-3">
                <h2 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-red-600" />
                    Syllabus Breakdown
                </h2>
                {detail.modules.map(mod => {
                    const modCompleted = mod.contents.filter(c => c.completed).length;
                    const isOpen = expandedModules[mod.id] === true;
                    return (
                        <Card key={mod.id} className="overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                onClick={() => toggleModule(mod.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${modCompleted === mod.contents.length ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}>
                                        {modCompleted}/{mod.contents.length}
                                    </div>
                                    <span className="font-medium text-zinc-900 dark:text-white text-sm text-left break-words">{mod.title}</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                    <div className="w-16 sm:w-24 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: mod.contents.length ? `${(modCompleted / mod.contents.length) * 100}%` : '0%' }}
                                        />
                                    </div>
                                    <span className="text-xs text-zinc-500">{isOpen ? '▲' : '▼'}</span>
                                </div>
                            </button>
                            {isOpen && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {mod.contents.map(content => (
                                        <div key={content.id} className="flex items-start gap-3 px-3 sm:px-4 py-3">
                                            {content.completed ? (
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-zinc-900 dark:text-white break-words">{content.title}</p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                    <span className="text-xs text-zinc-400">{TYPE_LABEL[content.contentType] || content.contentType}</span>
                                                    {content.watchedSeconds !== null && content.watchedSeconds > 0 && (
                                                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {fmtSeconds(content.watchedSeconds)}
                                                        </span>
                                                    )}
                                                    {content.quizScore !== null && (
                                                        <span className="text-xs font-medium text-blue-500">Quiz: {content.quizScore}%</span>
                                                    )}
                                                    {content.practiceScore && (
                                                        <span className={`text-xs font-medium ${content.practiceScore.passed ? 'text-green-500' : 'text-yellow-500'}`}>
                                                            <Target className="w-3 h-3 inline mr-0.5" />
                                                            {content.practiceScore.passed ? 'Passed' : 'Failed'} ({content.practiceScore.score})
                                                        </span>
                                                    )}
                                                    {content.completedAt && (
                                                        <span className="text-xs text-zinc-400">
                                                            {new Date(content.completedAt).toLocaleDateString('en-US')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
