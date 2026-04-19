import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Users, Star, BookOpen, Award, Play, ShoppingCart, CheckCircle, Sparkles, ArrowUpCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { ModuleAccordion } from '../components/ModuleAccordion';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { showErrorAlert, showSuccessAlert, showLoadingAlert } from '../lib/sweetalert';
import Swal from 'sweetalert2';

type Content = {
    contentId?: number;
    id?: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
    isFreePreview?: boolean;
};

type Module = {
    moduleId?: number;
    id?: number;
    title: string;
    order: number;
    contents: Content[];
};

type CourseDetailType = {
    id?: number;
    courseId?: number;
    title: string;
    description: string;
    price: number;
    trialDurationDays?: number | null;
    thumbnailUrl?: string;
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
    modules: Module[];
    averageRating?: number;
    totalEnrollments?: number;
    createdAt: string;
};

type EnrollmentSummary = {
    id: number;
    type: 'TRIAL' | 'PAID';
    expiresAt: string | null;
    progress: number;
};

export default function CourseDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);

    const {
        data: course,
        isLoading,
        isError,
    } = useQuery<CourseDetailType>({
        queryKey: ['course', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${id}`);
            return data;
        },
        enabled: !!id,
    });

    // Check if user is enrolled
    const { data: enrollment } = useQuery<EnrollmentSummary | null>({
        queryKey: ['enrollment', id],
        queryFn: async () => {
            try {
                const { data } = await apiClient.get(`/enroll/my-enrollments`);
                const match = data.find((e: any) => (e.course.courseId || e.course.id) === parseInt(id!));
                return match ?? null;
            } catch {
                return null;
            }
        },
        enabled: isAuthenticated && user?.role === 'STUDENT' && !!id,
    });

    const enrollMutation = useMutation({
        mutationFn: async (courseId: number) => {
            const { data } = await apiClient.post(`/enroll/checkout/${courseId}`);
            return data;
        },
        onSuccess: async (data) => {
            Swal.close();
            // Backend returns { url }, not { stripeUrl }
            if (data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else {
                // Free course - refresh to show enrollment
                await showSuccessAlert('Đăng ký thành công!', 'Bạn đã đăng ký khóa học thành công.');
                window.location.reload();
            }
        },
        onError: (error: any) => {
            Swal.close();
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Không thể tạo phiên thanh toán. Vui lòng thử lại.';
            showErrorAlert('Lỗi thanh toán', errorMessage);
        },
    });

    const trialMutation = useMutation({
        mutationFn: async (courseId: number) => {
            const { data } = await apiClient.post(`/enroll/trial/${courseId}`);
            return data as { url: string };
        },
        onSuccess: async (data) => {
            Swal.close();
            if (data.url) {
                window.location.href = data.url;
            } else {
                await showSuccessAlert('Học thử đã được kích hoạt!', 'Bạn có thể vào học ngay.');
                window.location.reload();
            }
        },
        onError: (error: any) => {
            Swal.close();
            const msg =
                error.response?.data?.error ||
                error.response?.data?.details ||
                'Không thể bắt đầu học thử. Vui lòng thử lại.';
            showErrorAlert('Lỗi học thử', msg);
        },
    });

    const handleStartTrial = async () => {
        if (!isAuthenticated) {
            const result = await showErrorAlert('Chưa đăng nhập', 'Bạn cần đăng nhập để học thử');
            if (result.isConfirmed) navigate('/login');
            return;
        }
        if (user?.role !== 'STUDENT') {
            showErrorAlert('Lỗi', 'Chỉ học viên mới có thể học thử');
            return;
        }
        if (!course) return;
        const courseId = course.courseId || course.id;
        if (!courseId) return;
        showLoadingAlert('Đang chuẩn bị phiên học thử...');
        trialMutation.mutate(courseId);
    };

    const handleEnroll = async () => {
        if (!isAuthenticated) {
            const result = await showErrorAlert(
                'Chưa đăng nhập',
                'Bạn cần đăng nhập để đăng ký khóa học'
            );
            if (result.isConfirmed) {
                navigate('/login');
            }
            return;
        }

        if (user?.role !== 'STUDENT') {
            showErrorAlert('Lỗi', 'Chỉ học viên mới có thể đăng ký khóa học');
            return;
        }

        if (!course) return;

        const courseId = course.courseId || course.id;
        if (!courseId) return;

        if (course.price === 0) {
            // Free course - enroll directly
            showLoadingAlert('Đang đăng ký khóa học...');
            enrollMutation.mutate(courseId);
        } else {
            // Paid course - go to Stripe
            showLoadingAlert('Đang chuyển đến trang thanh toán...');
            enrollMutation.mutate(courseId);
        }
    };

    const handleStartLearning = () => {
        const courseId = course?.courseId || course?.id;
        navigate(`/learning/${courseId}`);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !course) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <p className="text-red-600 dark:text-red-400">Không tìm thấy khóa học</p>
                <Link to="/">
                    <Button className="mt-4">Về trang chủ</Button>
                </Link>
            </div>
        );
    }

    const teacherName = [course.teacher.firstName, course.teacher.lastName]
        .filter(Boolean)
        .join(' ') || course.teacher.username;

    const formattedPrice = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(course.price);

    const totalLessons = course.modules.reduce((acc, module) => acc + module.contents.length, 0);
    const totalDuration = course.modules.reduce((acc, module) => 
        acc + module.contents.reduce((sum, content) => sum + (content.durationInSeconds || 0), 0), 0
    );

    const isEnrolled = !!enrollment;
    const isTrial = enrollment?.type === 'TRIAL';
    const trialOffered = typeof course.trialDurationDays === 'number' && course.trialDurationDays > 0;
    const showTrialButton = !isEnrolled && trialOffered && (user?.role === 'STUDENT' || !isAuthenticated);
    const showUpgradeButton = isTrial && course.price > 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-6">
                                {/* Category Badge */}
                                <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium">
                                    {course.category.name}
                                </div>

                                {/* Title */}
                                <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                                    {course.title}
                                </h1>

                                {/* Description */}
                                <p className="text-blue-100 text-lg">
                                    {course.description}
                                </p>

                                {/* Teacher & Stats */}
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 font-semibold">
                                            {teacherName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-blue-100 text-xs">Giảng viên</p>
                                            <p className="font-semibold">{teacherName}</p>
                                        </div>
                                    </div>

                                    {course.averageRating !== undefined && course.averageRating > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                            <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                                        </div>
                                    )}

                                    {course.totalEnrollments !== undefined && (
                                        <div className="flex items-center gap-1">
                                            <Users className="h-5 w-5" />
                                            <span>{course.totalEnrollments} học viên</span>
                                        </div>
                                    )}
                                </div>

                                {/* Price & CTA */}
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold">
                                        {course.price === 0 ? 'Miễn phí' : formattedPrice}
                                    </div>
                                </div>
                            </div>

                            {/* Thumbnail */}
                            <div className="relative">
                                <Card className="overflow-hidden border-4 border-white/20">
                                    {course.thumbnailUrl ? (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-full aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                                            <BookOpen className="h-24 w-24 text-slate-300 dark:text-slate-600" />
                                        </div>
                                    )}
                                </Card>

                                {/* Enroll / Trial / Upgrade Buttons */}
                                <div className="mt-6 space-y-3">
                                    {isEnrolled ? (
                                        <>
                                            <Button
                                                size="lg"
                                                onClick={handleStartLearning}
                                                className="w-full bg-white text-blue-600 hover:bg-blue-50 text-lg h-14"
                                            >
                                                <Play className="mr-2 h-5 w-5" />
                                                Bắt đầu học
                                            </Button>
                                            {showUpgradeButton && (
                                                <Button
                                                    size="lg"
                                                    onClick={handleEnroll}
                                                    disabled={enrollMutation.isPending}
                                                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90 text-lg h-14"
                                                >
                                                    {enrollMutation.isPending ? (
                                                        <>Đang xử lý...</>
                                                    ) : (
                                                        <>
                                                            <ArrowUpCircle className="mr-2 h-5 w-5" />
                                                            Nâng cấp lên đầy đủ ({formattedPrice})
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="lg"
                                                onClick={handleEnroll}
                                                disabled={enrollMutation.isPending || trialMutation.isPending}
                                                className="w-full bg-white text-blue-600 hover:bg-blue-50 text-lg h-14"
                                            >
                                                {enrollMutation.isPending ? (
                                                    <>Đang xử lý...</>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                                        {course.price === 0 ? 'Đăng ký ngay' : 'Mua khóa học'}
                                                    </>
                                                )}
                                            </Button>
                                            {showTrialButton && (
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    onClick={handleStartTrial}
                                                    disabled={enrollMutation.isPending || trialMutation.isPending}
                                                    className="w-full bg-white/10 border-white/40 text-white hover:bg-white/20 text-lg h-14"
                                                    data-testid="trial-button"
                                                >
                                                    {trialMutation.isPending ? (
                                                        <>Đang xử lý...</>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="mr-2 h-5 w-5" />
                                                            Học thử {course.trialDurationDays} ngày miễn phí
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Course Info */}
            <section className="py-12">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="md:col-span-2 space-y-8">
                                {/* What you'll learn */}
                                <Card className="p-6 border-slate-200 dark:border-slate-800">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                        Bạn sẽ học được gì?
                                    </h2>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {[
                                            'Nắm vững kiến thức cơ bản',
                                            'Thực hành qua các bài tập',
                                            'Áp dụng vào dự án thực tế',
                                            'Nhận chứng chỉ hoàn thành'
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-slate-700 dark:text-slate-300">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Course Content */}
                                <Card className="p-6 border-slate-200 dark:border-slate-800">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                                        Nội dung khóa học
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                                        {course.modules.length} chương • {totalLessons} bài học
                                        {totalDuration > 0 && ` • ${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`}
                                    </p>

                                    <ModuleAccordion
                                        modules={course.modules}
                                        isEnrolled={isEnrolled}
                                    />
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Course includes */}
                                <Card className="p-6 border-slate-200 dark:border-slate-800">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                                        Khóa học bao gồm
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <Clock className="h-5 w-5 text-slate-400" />
                                            <span>Truy cập trọn đời</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <BookOpen className="h-5 w-5 text-slate-400" />
                                            <span>{totalLessons} bài học</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <Award className="h-5 w-5 text-slate-400" />
                                            <span>Chứng chỉ hoàn thành</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <Users className="h-5 w-5 text-slate-400" />
                                            <span>Cộng đồng học tập</span>
                                        </li>
                                    </ul>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
