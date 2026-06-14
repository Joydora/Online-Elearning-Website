import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Award, BookOpen, ArrowRight, Sparkles, Target, Zap } from 'lucide-react';
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
                            <span>Nền tảng học trực tuyến hàng đầu Việt Nam</span>
                        </div>

                        {/* Heading */}
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight">
                            Khám phá tri thức
                            <span className="block text-red-100">
                                không giới hạn
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="text-base sm:text-lg md:text-xl text-red-100 max-w-2xl mx-auto px-2">
                            Hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng đầu.
                            Học bất cứ lúc nào, bất cứ nơi đâu với E-Learning Platform.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto">
                            <div className="relative">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                <Input
                                    type="text"
                                    placeholder="Tìm kiếm khóa học..."
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
                                    Tìm kiếm
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
                                    Khóa học
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    50K+
                                </div>
                                <div className="text-xs sm:text-sm md:text-base text-red-100 mt-1">
                                    Học viên
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                    4.8/5
                                </div>
                                <div className="text-xs sm:text-sm md:text-base text-red-100 mt-1">
                                    Đánh giá
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
                                Danh mục phổ biến
                            </h2>
                            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                                Khám phá các chủ đề bạn quan tâm
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                            {categories.map((category) => (
                                <Link
                                    key={category.id || category.categoryId}
                                    to={`/courses?category=${category.id || category.categoryId}`}
                                >
                                    <Card
                                        className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-200 cursor-pointer group border-zinc-200 dark:border-zinc-800 h-full"
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
                    </div>
                </section>
            )}

            {/* Featured Courses */}
            <section className="py-10 sm:py-16 bg-zinc-50 dark:bg-zinc-900">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-12">
                        <div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                                Khóa học nổi bật
                            </h2>
                            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                                Các khóa học được yêu thích nhất
                            </p>
                        </div>
                        <Link to="/courses" className="self-start sm:self-auto">
                            <Button variant="outline" className="gap-2 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                Xem tất cả
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
                                Chưa có khóa học nào
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
                            Tại sao chọn chúng tôi?
                        </h2>
                        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                            Nền tảng học tập hiện đại với nhiều tính năng ưu việt
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Target className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Học theo lộ trình
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Lộ trình học tập rõ ràng, từng bước từ cơ bản đến nâng cao
                            </p>
                        </Card>

                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Học mọi lúc mọi nơi
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Truy cập khóa học bất cứ khi nào, trên mọi thiết bị
                            </p>
                        </Card>

                        <Card className="p-6 sm:p-8 text-center hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800 group">
                            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 group-hover:scale-105 transition-transform">
                                <Award className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
                                Chứng chỉ hoàn thành
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Nhận chứng chỉ sau khi hoàn thành khóa học
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-20 bg-gradient-to-br from-[#2b0000] via-[#6d0202] to-[#060606]">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                        Bắt đầu hành trình học tập ngay hôm nay
                    </h2>
                    <p className="text-red-100 text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
                        Tham gia cùng hàng ngàn học viên đang học tập và phát triển kỹ năng mỗi ngày
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link to="/register">
                            <Button
                                size="lg"
                                className="bg-white text-red-700 hover:bg-red-100 shadow-lg shadow-red-900/30 border border-red-200 dark:border-red-500/40 dark:bg-white dark:text-red-700 dark:hover:bg-red-100"
                            >
                                Đăng ký ngay
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                Đăng nhập
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
