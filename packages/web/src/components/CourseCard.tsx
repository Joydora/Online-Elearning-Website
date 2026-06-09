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
    totalEnrollments?: number; // Legacy field, use _count.enrollments instead
    _count?: {
        enrollments: number;
    };
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

    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(course.price);

    return (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-200 border-zinc-200 dark:border-zinc-800">
            <Link to={`/courses/${courseId}`}>
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {course.thumbnailUrl ? (
                        <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                        </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-600 text-white">
                            {course.category.name}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-white line-clamp-2 break-all group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 break-all">
                        {course.description}
                    </p>

                    {/* Teacher */}
                    <Link
                        to={`/teachers/${course.teacher.id || course.teacher.userId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white text-xs font-medium">
                            {teacherName.charAt(0).toUpperCase()}
                        </div>
                        <span className="hover:underline">{teacherName}</span>
                    </Link>

                    {/* Stats */}
                    <div className="flex items-center gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        {course.averageRating !== undefined && course.averageRating > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                <span className="font-medium text-zinc-900 dark:text-white">
                                    {course.averageRating.toFixed(1)}
                                </span>
                            </div>
                        )}
                        {(course.totalEnrollments !== undefined || course._count?.enrollments !== undefined) && (
                            <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                                <Users className="h-4 w-4" />
                                <span>{course._count?.enrollments ?? course.totalEnrollments ?? 0} students</span>
                            </div>
                        )}
                    </div>

                    {/* Price & Button */}
                    <div className="flex items-center justify-between pt-3">
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                            {course.price === 0 ? 'Free' : formattedPrice}
                        </div>
                        <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            View Details
                        </Button>
                    </div>
                </div>
            </Link>
        </Card>
    );
}


