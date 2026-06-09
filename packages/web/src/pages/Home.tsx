import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Award, BookOpen, ArrowRight, Sparkles, Target, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../lib/api';
import { CourseCard, type Course } from '../components/CourseCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';

type Category = {
    id: number;
    categoryId?: number; // fallback
    name: string;
    _count?: {
        courses: number;
    };
};

export default function Home() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentCategoryPage, setCurrentCategoryPage] = useState(1);
    const categoriesPerPage = 6;

    const {
        data: courses = [],
        isLoading: coursesLoading,
    } = useQuery<Course[]>({
        queryKey: ['courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/courses');
            return data;
        },
    });

    const {
        data: categories = [],
    } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await apiClient.get('/categories');
            return data;
        },
    });

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/courses');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const totalCategoryPages = Math.ceil(categories.length / categoriesPerPage);
    const paginatedCategories = categories.slice(
        (currentCategoryPage - 1) * categoriesPerPage,
        currentCategoryPage * categoriesPerPage
    );

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#2b0000] via-[#5a0000] to-[#050505]">
                {/* Subtle Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-500/20 blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-red-900/40 blur-3xl"></div>
                </div>

                <div className="relative container mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-28">
                    <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs sm:text-sm font-medium border border-white/20">
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span>Vietnam's leading online learning platform</span>
                        </div>

                        {/* Heading */}
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight">
                            Discover knowledge
                            <span className="block text-red-100">
                                without limits
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="text-base sm:text-lg md:text-xl text-red-100 max-w-2xl mx-auto px-2">
                            Thousands of high-quality courses from leading experts.
                            Learn anytime, anywhere with E-Learning Platform.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto">
                            <div className="relative">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <Input
                                    type="text"
                                    placeholder="Search for courses..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="pl-10 sm:pl-12 pr-24 sm:pr-28 h-12 sm:h-14 text-sm sm:text-base bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-red-100/70 shadow-lg"
                                />
                                <Button
                                    onClick={handleSearch}
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-red-700 hover:bg-red-50 sm:h-10"
                                >
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto pt-8">
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    {courses.length}+
                                </div>
                                <div className="text-xs sm:text-sm md:text-base text-red-100 mt-1">
                                    Courses
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    50K+
                                </div>
                                <div className="text-xs sm:text-sm md:text-base text-red-100 mt-1">
                                    Students
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    4.8/5
                                </div>
                                <div className="text-xs sm:text-sm md:text-base text-red-100 mt-1">
                                    Reviews
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            {categories.length > 0 && (
                <section className="py-10 sm:py-16 bg-white dark:bg-zinc-950">
                    <div className="container mx-auto px-4 sm:px-6">
                        <div className="text-center mb-8 sm:mb-12">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                                Popular Categories
                            </h2>
                            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                                Explore topics you are interested in
                            </p>
                        </div>

                        <div className="relative flex items-center">
                            {totalCategoryPages > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentCategoryPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentCategoryPage === 1}
                                    className="absolute -left-4 sm:-left-6 z-10 h-10 w-10 rounded-full p-0 shadow-md border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 disabled:opacity-0 disabled:pointer-events-none transition-opacity duration-200"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            )}

                            <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                                {paginatedCategories.map((category) => (
                                    <Link
                                        key={category.id || category.categoryId}
                                        to={`/courses?category=${category.id || category.categoryId}`}
                                        className="h-full"
                                    >
                                        <Card
                                            className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group border-zinc-200 dark:border-zinc-800 h-full flex flex-col justify-center"
                                        >
                                            <div className="mx-auto mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                            </div>
                                            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors break-words">
                                                {category.name}
                                            </h3>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {totalCategoryPages > 1 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentCategoryPage(prev => Math.min(prev + 1, totalCategoryPages))}
                                    disabled={currentCategoryPage === totalCategoryPages}
                                    className="absolute -right-4 sm:-right-6 z-10 h-10 w-10 rounded-full p-0 shadow-md border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 disabled:opacity-0 disabled:pointer-events-none transition-opacity duration-200"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            )}
                        </div>

                        {/* Category Pagination Dots */}
                        {totalCategoryPages > 1 && (
                            <div className="flex justify-center items-center gap-1.5 mt-6">
                                {[...Array(totalCategoryPages)].map((_, index) => {
                                    const pageNum = index + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentCategoryPage(pageNum)}
                                            className={`h-2 rounded-full transition-all duration-300 ${currentCategoryPage === pageNum
                                                    ? 'w-6 bg-red-600'
                                                    : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                                                }`}
                                            aria-label={`Go to page ${pageNum}`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Featured Courses */}
            <section className="py-10 sm:py-16 bg-zinc-50 dark:bg-zinc-900">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-12">
                        <div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                                Featured Courses
                            </h2>
                            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                                Most popular courses
                            </p>
                        </div>
                        <Link to="/courses" className="self-start sm:self-auto">
                            <Button variant="outline" className="gap-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                View All
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>

                    {coursesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-zinc-200 dark:bg-zinc-800 aspect-video rounded-t-lg"></div>
                                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-b-lg space-y-3">
                                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-20">
                            <BookOpen className="h-16 w-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                            <p className="text-zinc-600 dark:text-zinc-400">
                                No courses available yet
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {courses.slice(0, 8).map((course) => (
                                <CourseCard key={course.courseId || course.id} course={course} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="py-10 sm:py-16 bg-white dark:bg-zinc-950">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                            Why Choose Us?
                        </h2>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            Modern learning platform with outstanding features
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Target className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Guided Learning Paths
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Clear learning roadmaps, step-by-step from beginner to advanced
                            </p>
                        </Card>

                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Learn Anytime, Anywhere
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Access courses whenever you want, on any device
                            </p>
                        </Card>

                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Award className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Completion Certificate
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Receive a certificate upon completing your courses
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-20 bg-gradient-to-br from-[#2b0000] via-[#6d0202] to-[#060606]">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                        Start your learning journey today
                    </h2>
                    <p className="text-red-100 text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
                        Join thousands of students learning and developing skills every day
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link to="/register">
                            <Button
                                size="lg"
                                className="bg-white text-red-700 hover:bg-red-100 shadow-lg shadow-red-900/30 border border-red-200 dark:border-red-500/40 dark:bg-white dark:text-red-700 dark:hover:bg-red-100"
                            >
                                Register Now
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
