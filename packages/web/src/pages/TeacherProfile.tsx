import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
    User,
    BookOpen,
    Users,
    Calendar,
    ArrowLeft,
    GraduationCap,
    Award,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiClient } from '../lib/api';

type TeacherCourse = {
    id: number;
    title: string;
    description: string;
    price: number;
    thumbnailUrl: string | null;
    createdAt: string;
    category: {
        id: number;
        name: string;
    };
    totalStudents: number;
    totalModules: number;
};

type TeacherProfile = {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    email: string;
    joinedAt: string;
    stats: {
        totalCourses: number;
        totalStudents: number;
    };
    courses: TeacherCourse[];
};

export default function TeacherProfile() {
    const { id } = useParams<{ id: string }>();

    const { data: teacher, isLoading, error } = useQuery<TeacherProfile>({
        queryKey: ['teacher', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/teachers/${id}`);
            return data;
        },
        enabled: !!id,
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatPrice = (price: number) => {
        if (price === 0) return 'Miễn phí';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(price);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Đang tải thông tin giảng viên...</p>
                </div>
            </div>
        );
    }

    if (error || !teacher) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                        Không tìm thấy giảng viên
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        Giảng viên này không tồn tại hoặc đã bị xóa.
                    </p>
                    <Link to="/courses">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Quay lại khóa học
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Hero Section */}
            <section className="relative py-10 sm:py-16 bg-red-600 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]"></div>

                <div className="container mx-auto px-4 sm:px-6 relative z-10">
                    <Link to="/courses" className="inline-flex items-center gap-2 text-red-200 hover:text-white mb-4 sm:mb-6 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại khóa học
                    </Link>

                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
                        {/* Avatar */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-2xl shrink-0">
                            <span className="text-4xl sm:text-5xl font-bold text-white">
                                {teacher.fullName.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="text-center md:text-left text-white flex-1 min-w-0">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <Award className="w-5 h-5 text-yellow-400" />
                                <span className="text-red-200 text-sm font-medium">Giảng viên</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words">{teacher.fullName}</h1>
                            <p className="text-red-200 mb-4 break-all">@{teacher.username}</p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-red-300" />
                                    <span className="text-red-100">
                                        Tham gia: {formatDate(teacher.joinedAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-6 sm:py-8 -mt-6 sm:-mt-8 relative z-20">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                        <Card className="p-4 sm:p-6 text-center bg-white dark:bg-zinc-900 shadow-xl">
                            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-red-600" />
                            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                                {teacher.stats.totalCourses}
                            </div>
                            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Khóa học</div>
                        </Card>
                        <Card className="p-4 sm:p-6 text-center bg-white dark:bg-zinc-900 shadow-xl">
                            <Users className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                                {teacher.stats.totalStudents}
                            </div>
                            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Học viên</div>
                        </Card>
                        <Card className="p-4 sm:p-6 text-center bg-white dark:bg-zinc-900 shadow-xl col-span-2 md:col-span-1">
                            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                                {teacher.courses.reduce((sum, c) => sum + c.totalModules, 0)}
                            </div>
                            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Bài giảng</div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Courses */}
            <section className="py-10 sm:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-6 sm:mb-8 text-center break-words">
                        Khóa học của {teacher.fullName}
                    </h2>

                    {teacher.courses.length === 0 ? (
                        <Card className="max-w-md mx-auto p-6 sm:p-8 text-center">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                                Chưa có khóa học
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Giảng viên này chưa tạo khóa học nào.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
                            {teacher.courses.map((course) => (
                                <Link key={course.id} to={`/courses/${course.id}`}>
                                    <Card className="overflow-hidden hover:shadow-xl transition-all group h-full">
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-red-600 relative overflow-hidden">
                                            {course.thumbnailUrl ? (
                                                <img
                                                    src={course.thumbnailUrl}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen className="w-16 h-16 text-white/50" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <span className="px-3 py-1 bg-white/90 dark:bg-zinc-900/90 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                    {course.category.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            <h3 className="font-bold text-zinc-900 dark:text-white mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                                                {course.title}
                                            </h3>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
                                                {course.description}
                                            </p>

                                            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {course.totalStudents} học viên
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="w-4 h-4" />
                                                    {course.totalModules} chương
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className={`font-bold ${course.price === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatPrice(course.price)}
                                                </span>
                                                <Button size="sm" variant="outline" className="group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-colors">
                                                    Xem chi tiết
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}


