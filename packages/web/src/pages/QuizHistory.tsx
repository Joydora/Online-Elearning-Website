import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, BookOpen, ArrowLeft, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';

type QuizAttempt = {
    attemptId: number;
    score: number;
    startTime: string;
    endTime: string;
    quiz: {
        contentId: number;
        title: string;
        moduleName: string;
    };
    course: {
        id: number;
        title: string;
        thumbnailUrl: string | null;
    };
};

export default function QuizHistory() {
    const { data: attempts, isLoading, error } = useQuery<QuizAttempt[]>({
        queryKey: ['quiz-history'],
        queryFn: async () => {
            const { data } = await apiClient.get<QuizAttempt[]>('/quiz/history');
            return data;
        },
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-500/10 border-green-500/30';
        if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
        return 'bg-red-500/10 border-red-500/30';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Could not load quiz history
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">Please try again later</p>
                </div>
            </div>
        );
    }

    // Group attempts by course
    const groupedByCourse = attempts?.reduce((acc, attempt) => {
        const courseId = attempt.course.id;
        if (!acc[courseId]) {
            acc[courseId] = {
                course: attempt.course,
                attempts: [],
            };
        }
        acc[courseId].attempts.push(attempt);
        return acc;
    }, {} as Record<number, { course: QuizAttempt['course']; attempts: QuizAttempt[] }>);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 sm:py-8 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Link to="/my-courses" className="shrink-0">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-3">
                            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 shrink-0" />
                            <span className="truncate">Quiz History</span>
                        </h1>
                        <p className="text-xs sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">
                            Review your quiz attempt results
                        </p>
                    </div>
                </div>

                {/* Stats Summary */}
                {attempts && attempts.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Attempts</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{attempts.length}</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-green-500/10 border-green-500/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Average Score</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                        {(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-500/20">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Highest Score</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                        {Math.max(...attempts.map(a => a.score))}%
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-red-500/10 border-red-500/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/20">
                                    <BookOpen className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Courses</p>
                                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                        {Object.keys(groupedByCourse || {}).length}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Empty State */}
                {(!attempts || attempts.length === 0) && (
                    <Card className="p-8 sm:p-12 text-center">
                        <BookOpen className="h-16 w-16 text-zinc-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                            No quiz history yet
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            You haven't taken any quizzes yet. Start learning and test your knowledge!
                        </p>
                        <Link to="/my-courses">
                            <Button className="bg-red-600 hover:bg-red-700 text-white">
                                Go to My Courses
                            </Button>
                        </Link>
                    </Card>
                )}

                {/* Quiz History by Course */}
                {groupedByCourse && Object.values(groupedByCourse).map(({ course, attempts: courseAttempts }) => (
                    <div key={course.id} className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                            {course.thumbnailUrl ? (
                                <img
                                    src={course.thumbnailUrl}
                                    alt={course.title}
                                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <Link to={`/learning/${course.id}`}>
                                    <h2 className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors break-words">
                                        {course.title}
                                    </h2>
                                </Link>
                                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                                    {courseAttempts.length} attempts
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:gap-4">
                            {courseAttempts.map((attempt) => (
                                <Card
                                    key={attempt.attemptId}
                                    className={`p-4 border ${getScoreBg(attempt.score)} hover:shadow-lg transition-shadow`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-zinc-900 dark:text-white break-words">
                                                {attempt.quiz.title}
                                            </h3>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 break-words">
                                                {attempt.quiz.moduleName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-zinc-500">
                                                <Calendar className="h-4 w-4 shrink-0" />
                                                <span>{formatDate(attempt.endTime)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                                            <div className="text-center">
                                                <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(attempt.score)}`}>
                                                    {attempt.score}%
                                                </div>
                                                <p className="text-xs text-zinc-500">Score</p>
                                            </div>

                                            <Link to={`/learning/${course.id}`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    Retake
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


