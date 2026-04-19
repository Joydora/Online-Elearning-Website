import { Link } from 'react-router-dom';
import { Users, Star, BookOpen } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export type Course = {
    id?: number;  // Backend uses "id"
    courseId?: number;  // Some places might use courseId
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string | null;
    teacher: {
        id?: number;
        userId?: number;
        firstName: string | null;
        lastName: string | null;
        username: string;
    };
    category: {
        id?: number;
        categoryId?: number;
        name: string;
    };
    averageRating?: number;
    totalEnrollments?: number;
    createdAt: string;
};

type CourseCardProps = {
    course: Course;
};

export function CourseCard({ course }: CourseCardProps) {
    const courseId = course.courseId || course.id;
    const teacherName = [course.teacher.firstName, course.teacher.lastName]
        .filter(Boolean)
        .join(' ') || course.teacher.username;

    const formattedPrice = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(course.price);

    return (
        <Card className="group overflow-hidden hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 border-gray-200 dark:border-gray-800">
            <Link to={`/courses/${courseId}`}>
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-red-50 to-gray-100 dark:from-gray-900 dark:to-black">
                    {course.thumbnailUrl ? (
                        <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-16 w-16 text-red-200 dark:text-gray-700" />
                        </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-600 to-red-800 text-white backdrop-blur-sm shadow-lg shadow-red-500/30">
                            {course.category.name}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {course.description}
                    </p>

                    {/* Teacher */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white text-xs font-medium shadow-md shadow-red-500/30">
                            {teacherName.charAt(0).toUpperCase()}
                        </div>
                        <span>{teacherName}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-800">
                        {course.averageRating !== undefined && course.averageRating > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {course.averageRating.toFixed(1)}
                                </span>
                            </div>
                        )}
                        {course.totalEnrollments !== undefined && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                <Users className="h-4 w-4" />
                                <span>{course.totalEnrollments} học viên</span>
                            </div>
                        )}
                    </div>

                    {/* Price & Button */}
                    <div className="flex items-center justify-between pt-3">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {course.price === 0 ? 'Miễn phí' : formattedPrice}
                        </div>
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg shadow-red-500/30"
                        >
                            Xem chi tiết
                        </Button>
                    </div>
                </div>
            </Link>
        </Card>
    );
}

