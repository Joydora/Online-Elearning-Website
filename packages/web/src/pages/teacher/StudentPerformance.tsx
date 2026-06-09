import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    TrendingUp,
    CheckCircle,
    Clock,
    FileText,
    Video,
    ClipboardList,
    BarChart3
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '../../lib/api';

type StudentPerformance = {
    student: {
        id: number;
        username: string;
        email: string;
        fullName: string;
    };
    enrollment: {
        enrollmentDate: string;
        progress: number;
        completionDate: string | null;
    };
    contentProgress: {
        totalContents: number;
        completedContents: number;
        progress: number;
        completedContentIds: number[];
    };
    quizStats: Array<{
        contentId: number;
        title: string;
        attempts: Array<{
            id: number;
            score: number;
            createdAt: string;
        }>;
        bestScore: number | null;
        averageScore: number | null;
        totalAttempts: number;
    }>;
    modules: Array<{
        id: number;
        title: string;
        order: number;
        contents: Array<{
            id: number;
            title: string;
            contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
            order: number;
            isCompleted: boolean;
        }>;
    }>;
};

export default function StudentPerformance() {
    const { id, studentId } = useParams<{ id: string; studentId: string }>();
    const courseId = parseInt(id || '0', 10);
    const studentIdNum = parseInt(studentId || '0', 10);

    // Fetch student performance
    const { data: performance, isLoading } = useQuery<StudentPerformance>({
        queryKey: ['student-performance', courseId, studentIdNum],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}/students/${studentIdNum}/performance`);
            return data;
        },
        enabled: !!courseId && !!studentIdNum,
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getContentIcon = (contentType: string) => {
        switch (contentType) {
            case 'VIDEO':
                return <Video className="w-4 h-4" />;
            case 'DOCUMENT':
                return <FileText className="w-4 h-4" />;
            case 'QUIZ':
                return <ClipboardList className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (!performance) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center">
                    <p className="text-zinc-600 dark:text-zinc-400">Performance data not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-6 sm:py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <Link to={`/courses/${courseId}/students`}>
                        <Button variant="ghost" className="mb-3 sm:mb-4 gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Enrolled Students
                        </Button>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                        Student Performance
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 break-words">
                        Detailed learning performance of {performance.student.fullName}
                    </p>
                </div>

                {/* Student Info Card */}
                <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shrink-0">
                                {performance.student.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white mb-1 break-words">
                                    {performance.student.fullName}
                                </h2>
                                <p className="text-xs sm:text-base text-zinc-600 dark:text-zinc-400 mb-1">
                                    @{performance.student.username}
                                </p>
                                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500 break-all">
                                    {performance.student.email}
                                </p>
                            </div>
                        </div>
                        <div className="sm:text-right">
                            <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500 mb-1">Enrollment Date</div>
                            <div className="text-sm sm:text-base text-zinc-900 dark:text-white font-medium">
                                {formatDate(performance.enrollment.enrollmentDate)}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <Card className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Overall Progress</div>
                                <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                                    {performance.enrollment.progress.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                            <div
                                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                                style={{ width: `${performance.enrollment.progress}%` }}
                            />
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-600 dark:bg-green-500 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Completed Content</div>
                                <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                                    {performance.contentProgress.completedContents}/{performance.contentProgress.totalContents}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                            {performance.contentProgress.progress.toFixed(1)}% completed
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Quizzes Taken</div>
                                <div className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
                                    {performance.quizStats.length}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                            {performance.quizStats.filter((q) => q.totalAttempts > 0).length} graded quizzes
                        </div>
                    </Card>
                </div>

                {/* Quiz Performance */}
                {performance.quizStats.length > 0 && (
                    <Card className="mb-6 sm:mb-8">
                        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Quiz Results
                            </h2>
                        </div>
                        <div className="p-4 sm:p-6">
                            <div className="space-y-3 sm:space-y-4">
                                {performance.quizStats.map((quiz) => (
                                    <div
                                        key={quiz.contentId}
                                        className="p-3 sm:p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                            <div className="flex items-start gap-2 min-w-0 flex-1">
                                                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white break-words min-w-0">
                                                    {quiz.title}
                                                </h3>
                                            </div>
                                            <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-500 shrink-0">
                                                {quiz.totalAttempts} attempts
                                            </div>
                                        </div>
                                        {quiz.bestScore !== null && (
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">Highest Score</div>
                                                    <div className={`text-2xl font-bold ${getScoreColor(quiz.bestScore)}`}>
                                                        {quiz.bestScore.toFixed(1)}%
                                                    </div>
                                                </div>
                                                {quiz.averageScore !== null && (
                                                    <div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1">Average Score</div>
                                                        <div className={`text-2xl font-bold ${getScoreColor(quiz.averageScore)}`}>
                                                            {quiz.averageScore.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {quiz.attempts.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">Quiz History:</div>
                                                <div className="space-y-2">
                                                    {quiz.attempts.slice(0, 5).map((attempt) => (
                                                        <div
                                                            key={attempt.id}
                                                            className="flex items-center justify-between text-sm"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                 <Clock className="w-4 h-4 text-zinc-400" />
                                                                 <span className="text-zinc-600 dark:text-zinc-400">
                                                                     {formatDate(attempt.createdAt)}
                                                                 </span>
                                                            </div>
                                                            <span className={`font-semibold ${getScoreColor(attempt.score)}`}>
                                                                {attempt.score.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {quiz.attempts.length > 5 && (
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                                                            ... and {quiz.attempts.length - 5} other attempts
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Content Progress */}
                <Card>
                    <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Content Progress
                        </h2>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="space-y-4 sm:space-y-6">
                            {performance.modules.map((module) => (
                                <div key={module.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 sm:p-4">
                                    <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-3 break-words">
                                        {module.title}
                                    </h3>
                                    <div className="space-y-2">
                                        {module.contents.map((content) => (
                                            <div
                                                key={content.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg ${content.isCompleted
                                                        ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                                                        : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800'
                                                    }`}
                                            >
                                                <div className={`flex-shrink-0 ${content.isCompleted
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-zinc-400 dark:text-zinc-600'
                                                    }`}>
                                                    {getContentIcon(content.contentType)}
                                                </div>
                                                <div className="flex-1 min-w-0 text-xs sm:text-sm text-zinc-900 dark:text-white break-words">
                                                    {content.title}
                                                </div>
                                                {content.isCompleted ? (
                                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <Clock className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}


