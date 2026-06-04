import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Clock, CheckCircle, Trophy } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

type EnrolledCourse = {
    enrollmentId: number;
    enrolledAt: string;
    progress: number;
    completionDate: string | null;
    course: {
        id?: number;
        courseId?: number;
        title: string;
        description: string;
        thumbnailUrl?: string;
        teacher: {
            firstName: string | null;
            lastName: string | null;
            username: string;
        };
        category: {
            name: string;
        };
    };
};

export default function MyCourses() {
    const { data: enrollments = [], isLoading } = useQuery<EnrolledCourse[]>({
        queryKey: ['my-enrollments'],
        queryFn: async () => {
            const { data } = await apiClient.get('/enroll/my-enrollments');
            return data;
        },
    });

    const completedCourses = enrollments.filter(e => e.completionDate);
    const inProgressCourses = enrollments.filter(e => !e.completionDate);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-zinc-600 dark:text-zinc-400">Đang tải khóa học...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Khóa học của tôi
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                        Quản lý và tiếp tục học các khóa học bạn đã đăng ký
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8" />
                            <div>
                                <p className="text-2xl font-bold">{enrollments.length}</p>
                                <p className="text-sm text-blue-100">Tổng khóa học</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8" />
                            <div>
                                <p className="text-2xl font-bold">{inProgressCourses.length}</p>
                                <p className="text-sm text-amber-100">Đang học</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8" />
                            <div>
                                <p className="text-2xl font-bold">{completedCourses.length}</p>
                                <p className="text-sm text-green-100">Đã hoàn thành</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {enrollments.length === 0 ? (
                    <Card className="p-8 sm:p-12 text-center">
                        <BookOpen className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                            Chưa có khóa học nào
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                            Bạn chưa đăng ký khóa học nào. Hãy khám phá và bắt đầu học ngay!
                        </p>
                        <Link to="/courses">
                            <Button className="bg-red-600 hover:bg-red-700">
                                Khám phá khóa học
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* In Progress */}
                        {inProgressCourses.length > 0 && (
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Đang học ({inProgressCourses.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {inProgressCourses.map((enrollment) => (
                                        <CourseCard key={enrollment.enrollmentId} enrollment={enrollment} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed */}
                        {completedCourses.length > 0 && (
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Đã hoàn thành ({completedCourses.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {completedCourses.map((enrollment) => (
                                        <CourseCard key={enrollment.enrollmentId} enrollment={enrollment} completed />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function CourseCard({ enrollment, completed }: { enrollment: EnrolledCourse; completed?: boolean }) {
    const course = enrollment.course;
    const courseId = course.courseId || course.id;
    const teacherName = [course.teacher.firstName, course.teacher.lastName]
        .filter(Boolean)
        .join(' ') || course.teacher.username;

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
                {course.thumbnailUrl ? (
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                    </div>
                )}
                {completed && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Hoàn thành
                    </div>
                )}
                <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                        {course.category.name}
                    </span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 line-clamp-2 break-all">
                    {course.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {teacherName}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        <span>Tiến độ</span>
                        <span>{enrollment.progress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${completed
                                    ? 'bg-green-500'
                                    : 'bg-red-600'
                                }`}
                            style={{ width: `${enrollment.progress}%` }}
                        />
                    </div>
                </div>

                <Link to={`/learning/${courseId}`}>
                    <Button className="w-full gap-2 bg-red-600 hover:bg-red-700">
                        <Play className="w-4 h-4" />
                        {completed ? 'Xem lại' : 'Tiếp tục học'}
                    </Button>
                </Link>
            </div>
        </Card>
    );
}


