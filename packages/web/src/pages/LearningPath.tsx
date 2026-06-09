import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, ChevronRight, Loader2, Star, Users } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type RecommendedCourse = {
    id: number;
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string;
    level?: string;
    averageRating?: number;
    totalEnrollments?: number;
    teacher: { firstName: string | null; lastName: string | null; username: string };
    prerequisites?: Array<{ id: number }>;
    score: number;
};

const LEVELS = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
];

const LEVEL_LABELS: Record<string, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
};

export default function LearningPath() {
    const [goal, setGoal] = useState('');
    const [currentLevel, setCurrentLevel] = useState('BEGINNER');

    const recommendMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post<{ courses: RecommendedCourse[] }>('/recommend/path', { goal, currentLevel });
            return data.courses ?? [];
        },
    });

    const fmt = (n: number) => n === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    return (
        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-4xl">
            <div className="text-center mb-8 sm:mb-10">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">AI Learning Path</h1>
                </div>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    Describe your goals and let AI suggest the most suitable learning path
                </p>
            </div>

            <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Your Learning Goal
                        </label>
                        <textarea
                            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none disabled:opacity-60"
                            rows={3}
                            placeholder="e.g., I want to become a fullstack web developer in 6 months..."
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            disabled={recommendMutation.isPending}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Current Level
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            {LEVELS.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setCurrentLevel(value)}
                                    disabled={recommendMutation.isPending}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-60 ${currentLevel === value ? 'bg-red-600 text-white border-red-600' : 'border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Button
                        onClick={() => recommendMutation.mutate()}
                        disabled={recommendMutation.isPending || !goal.trim()}
                        className="bg-red-600 hover:bg-red-700 gap-2 w-full"
                    >
                        {recommendMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                        ) : (
                            <><Sparkles className="w-4 h-4" />Generate Path</>
                        )}
                    </Button>
                </div>
            </Card>

            {recommendMutation.data && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-red-600" />
                        Suggested Path ({recommendMutation.data.length} courses)
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        The learning sequence is ordered by difficulty and course prerequisites.
                    </p>
                    <div className="relative space-y-4">
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                        {recommendMutation.data.map((course, index) => {
                            const teacherName = [course.teacher.firstName, course.teacher.lastName].filter(Boolean).join(' ') || course.teacher.username;
                            return (
                                <Card key={course.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow relative ml-0 md:ml-3">
                                    <div className="flex gap-3 sm:gap-4 items-start">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-sm relative z-10">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white break-words">{course.title}</h3>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{teacherName}</p>
                                                </div>
                                                <div className="sm:text-right flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                                                    <p className="font-bold text-red-600">{fmt(course.price)}</p>
                                                    {course.level && (
                                                        <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                                                            {LEVEL_LABELS[course.level] || course.level}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">{course.description}</p>
                                            {course.prerequisites && course.prerequisites.length > 0 && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                                    Prerequisites: {course.prerequisites.length} courses
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                                                {course.averageRating !== undefined && course.averageRating > 0 && (
                                                    <div className="flex items-center gap-1 text-sm text-zinc-500">
                                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                                        {course.averageRating.toFixed(1)}
                                                    </div>
                                                )}
                                                {course.totalEnrollments !== undefined && (
                                                    <div className="flex items-center gap-1 text-sm text-zinc-500">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {course.totalEnrollments}
                                                    </div>
                                                )}
                                                <Link to={`/courses/${course.id}`} className="ml-auto">
                                                    <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1 text-xs">
                                                        View Course
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {recommendMutation.isError && (
                <div className="text-center text-red-500 mt-4">
                    Failed to generate path. Please try again.
                </div>
            )}
        </div>
    );
}
