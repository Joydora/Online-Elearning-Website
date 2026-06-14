import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, Map, Loader2, Bot, Settings, ArrowRight, BookOpen } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

type RecommendedCourse = {
    courseId: number;
    title: string;
    level: CourseLevel | null;
    rationale: string;
};

type RecommendResponse = {
    ordered: RecommendedCourse[];
    generatedBy: 'ai' | 'fallback';
    note?: string;
};

const LEVEL_LABEL: Record<CourseLevel, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
};

const LEVEL_TONE: Record<CourseLevel, string> = {
    BEGINNER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    ADVANCED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function LearningPath() {
    const [goal, setGoal] = useState('');
    const [currentLevel, setCurrentLevel] = useState<CourseLevel | ''>('');
    const [maxCourses, setMaxCourses] = useState(5);

    const recommend = useMutation<RecommendResponse, Error, void>({
        mutationFn: async () => {
            const payload: Record<string, unknown> = { goal: goal.trim(), maxCourses };
            if (currentLevel) payload.currentLevel = currentLevel;
            const { data } = await apiClient.post('/recommend/path', payload);
            return data;
        },
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!goal.trim()) return;
        recommend.mutate();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-10 max-w-4xl">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-sm mb-4">
                        <Sparkles className="h-4 w-4" />
                        Lộ trình học do AI gợi ý
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-3">
                        <Map className="h-8 w-8" />
                        Tìm lộ trình học cho bạn
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Mô tả mục tiêu của bạn, hệ thống sẽ gợi ý chuỗi khoá học từ cơ bản đến nâng cao.
                    </p>
                </div>

                <Card className="p-6 mb-6">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Mục tiêu của bạn <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                data-testid="goal-input"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                placeholder="VD: Trở thành lập trình viên fullstack web với React và Node.js"
                                maxLength={500}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none min-h-[100px]"
                            />
                            <p className="text-xs text-slate-500 mt-1">{goal.length}/500</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Trình độ hiện tại
                                </label>
                                <select
                                    data-testid="level-input"
                                    value={currentLevel}
                                    onChange={(e) => setCurrentLevel(e.target.value as CourseLevel | '')}
                                    className="w-full h-12 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                >
                                    <option value="">Bất kỳ</option>
                                    <option value="BEGINNER">Beginner</option>
                                    <option value="INTERMEDIATE">Intermediate</option>
                                    <option value="ADVANCED">Advanced</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Số khoá tối đa: {maxCourses}
                                </label>
                                <input
                                    data-testid="max-input"
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={maxCourses}
                                    onChange={(e) => setMaxCourses(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={recommend.isPending || !goal.trim()}
                            data-testid="recommend-submit"
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                            {recommend.isPending ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gợi ý...</>
                            ) : (
                                <><Sparkles className="h-4 w-4 mr-2" /> Tạo lộ trình</>
                            )}
                        </Button>
                    </form>
                </Card>

                {recommend.isError && (
                    <Card className="p-4 mb-6 border-red-300 bg-red-50 dark:bg-red-950/30">
                        <p className="text-sm text-red-700 dark:text-red-300">
                            {(recommend.error as any)?.response?.data?.error ?? 'Có lỗi xảy ra. Vui lòng thử lại.'}
                        </p>
                    </Card>
                )}

                {recommend.data && (
                    <div data-testid="recommend-result">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Lộ trình gợi ý ({recommend.data.ordered.length} khoá)
                            </h2>
                            <span
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800"
                                data-testid="generated-by"
                            >
                                {recommend.data.generatedBy === 'ai' ? (
                                    <><Bot className="h-3 w-3" /> AI</>
                                ) : (
                                    <><Settings className="h-3 w-3" /> Heuristic</>
                                )}
                            </span>
                        </div>

                        {recommend.data.note && (
                            <p className="text-sm text-slate-500 mb-4 italic">{recommend.data.note}</p>
                        )}

                        {recommend.data.ordered.length === 0 ? (
                            <Card className="p-8 text-center text-slate-500">
                                Không tìm được khoá phù hợp. Hãy thử mục tiêu khác.
                            </Card>
                        ) : (
                            <ol className="space-y-3">
                                {recommend.data.ordered.map((c, idx) => (
                                    <li key={c.courseId}>
                                        <Card className="p-5" data-testid={`recommend-row-${c.courseId}`}>
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h3 className="font-bold text-slate-900 dark:text-white">{c.title}</h3>
                                                        {c.level && (
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${LEVEL_TONE[c.level]}`}>
                                                                {LEVEL_LABEL[c.level]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {c.rationale}
                                                    </p>
                                                </div>
                                                <Link to={`/courses/${c.courseId}`}>
                                                    <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
                                                        <BookOpen className="h-4 w-4" />
                                                        Xem
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </Card>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
