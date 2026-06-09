import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Edit, FolderOpen, Plus, ClipboardCheck } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import { Pagination } from '../../components/ui/Pagination';

type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

const STATUS_LABELS: Record<CourseStatus, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PUBLISHED: 'Published',
};

const STATUS_COLORS: Record<CourseStatus, string> = {
    DRAFT: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function ManageCourses() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const coursesPerPage = 10;

    const { data: courses = [] } = useQuery({
        queryKey: ['admin-courses'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/courses');
            return data;
        },
    });

    const totalPages = Math.ceil(courses.length / coursesPerPage);
    const paginatedCourses = courses.slice((currentPage - 1) * coursesPerPage, currentPage * coursesPerPage);

    const deleteMutation = useMutation({
        mutationFn: async (courseId: number) => {
            await apiClient.delete(`/admin/courses/${courseId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            showSuccessAlert('Success', 'Course deleted successfully');
        },
        onError: (error: any) => {
            // Surface server-side message (e.g., cannot delete because course has enrollments)
            const apiMessage =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Could not delete course';
            showErrorAlert('Error', apiMessage);
        },
    });

    const handleDelete = async (courseId: number, title: string) => {
        const result = await showConfirmAlert(
            'Delete Course',
            `Are you sure you want to delete the course "${title}"?`
        );
        if (result.isConfirmed) {
            deleteMutation.mutate(courseId);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-6xl">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-3 sm:mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">Manage Courses</h1>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            onClick={() => navigate('/admin/courses/review')}
                            variant="outline"
                            className="border-amber-600 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30 w-full sm:w-auto"
                        >
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Review Courses
                        </Button>
                        <Button
                            onClick={() => navigate('/admin/courses/create')}
                            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Course
                        </Button>
                    </div>
                </div>
                <div className="grid gap-3 sm:gap-4 mb-6">
                    {paginatedCourses.map((course: any) => (
                        <Card key={course.id} className="p-4 sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                                        <h3 className="font-bold text-base sm:text-lg break-words min-w-0">{course.title}</h3>
                                        {course.status && (
                                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[course.status as CourseStatus]}`}>
                                                {STATUS_LABELS[course.status as CourseStatus] ?? course.status}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 break-words">
                                        Instructor: {course.teacher?.firstName} {course.teacher?.lastName} •{' '}
                                        Category: {course.category?.name} •{' '}
                                        Enrollments: {course._count?.enrollments}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-2 sm:gap-3 lg:justify-end">
                                    <p className="font-bold text-red-600 text-sm sm:text-base">
                                        {course.price === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.price)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/admin/courses/${course.id}/manage`)}
                                            title="Manage Content"
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(course.id, course.title)}
                                            disabled={deleteMutation.isPending}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            </div>
        </div>
    );
}


