import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Award, BookOpen, ArrowRight, Sparkles, Target, Zap } from 'lucide-react';
import { apiClient } from '../lib/api';
import { CourseCard, type Course } from '../components/CourseCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';

type Category = {
    categoryId: number;
    name: string;
    _count?: {
        courses: number;
    };
};

export default function Home() {
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

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-black dark:from-red-900 dark:via-black dark:to-gray-950">
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-400/20 blur-3xl animate-pulse dark:bg-red-600/20"></div>
                    <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-black/30 blur-3xl animate-pulse delay-1000 dark:bg-black/50"></div>
                </div>

                <div className="relative container mx-auto px-4 py-20 md:py-28">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
                            <Sparkles className="h-4 w-4" />
                            <span>Nền tảng học trực tuyến hàng đầu Việt Nam</span>
                        </div>

                        {/* Heading */}
                        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                            Khám phá tri thức
                            <span className="block bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                                không giới hạn
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="text-lg md:text-xl text-red-100 max-w-2xl mx-auto">
                            Hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng đầu. 
                            Học bất cứ lúc nào, bất cứ nơi đâu với E-Learning Platform.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Tìm kiếm khóa học..."
                                    className="pl-12 pr-4 h-14 text-base bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-red-200 shadow-lg"
                                />
                                <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-red-600 hover:bg-red-50">
                                    Tìm kiếm
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-white">
                                    {courses.length}+
                                </div>
                                <div className="text-sm md:text-base text-red-100 mt-1">
                                    Khóa học
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-white">
                                    50K+
                                </div>
                                <div className="text-sm md:text-base text-red-100 mt-1">
                                    Học viên
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-white">
                                    4.8/5
                                </div>
                                <div className="text-sm md:text-base text-red-100 mt-1">
                                    Đánh giá
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            {categories.length > 0 && (
                <section className="py-16 bg-white dark:bg-gray-950">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                                Danh mục phổ biến
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Khám phá các chủ đề bạn quan tâm
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {categories.map((category) => (
                                <Card
                                    key={category.categoryId}
                                    className="p-6 text-center hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 cursor-pointer group border-gray-200 dark:border-gray-800"
                                >
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                        <BookOpen className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                        {category.name}
                                    </h3>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Courses */}
            <section className="py-16 bg-gray-50 dark:bg-black">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                Khóa học nổi bật
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Các khóa học được yêu thích nhất
                            </p>
                        </div>
                        <Button variant="outline" className="gap-2 hidden md:flex border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            Xem tất cả
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {coursesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-200 dark:bg-gray-800 aspect-video rounded-t-lg"></div>
                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-b-lg space-y-3">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-20">
                            <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">
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
            <section className="py-16 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Tại sao chọn chúng tôi?
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Nền tảng học tập hiện đại với nhiều tính năng ưu việt
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="p-8 text-center hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 border-gray-200 dark:border-gray-800 group">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                <Target className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                Học theo lộ trình
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Lộ trình học tập rõ ràng, từng bước từ cơ bản đến nâng cao
                            </p>
                        </Card>

                        <Card className="p-8 text-center hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 border-gray-200 dark:border-gray-800 group">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                Học mọi lúc mọi nơi
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Truy cập khóa học bất cứ khi nào, trên mọi thiết bị
                            </p>
                        </Card>

                        <Card className="p-8 text-center hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 border-gray-200 dark:border-gray-800 group">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                <Award className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                Chứng chỉ hoàn thành
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Nhận chứng chỉ sau khi hoàn thành khóa học
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-red-600 via-red-700 to-black dark:from-red-900 dark:via-black dark:to-gray-950">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Bắt đầu hành trình học tập ngay hôm nay
                    </h2>
                    <p className="text-red-100 text-lg mb-8 max-w-2xl mx-auto">
                        Tham gia cùng hàng ngàn học viên đang học tập và phát triển kỹ năng mỗi ngày
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register">
                            <Button size="lg" className="bg-white text-red-600 hover:bg-red-50">
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
