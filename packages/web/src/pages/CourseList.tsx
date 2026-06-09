import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export type Course = {
    id: number;
    title: string;
    description: string;
    price: number;
};

type CourseListProps = {
    courses: Course[];
};

export function CourseList({ courses }: CourseListProps) {
    if (courses.length === 0) {
        return (
            <div className="text-center text-slate-500">
                No courses have been published yet.
            </div>
        );
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
                <Card key={course.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-slate-900">{course.title}</CardTitle>
                        <CardDescription className="text-slate-600 line-clamp-2">
                            {course.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium text-emerald-600">{course.price.toLocaleString()} USD</p>
                    </CardContent>
                    <CardFooter className="mt-auto">
                        <Button asChild className="w-full" variant="default">
                            <Link to={`/courses/${course.id}`}>
                                View Details
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
