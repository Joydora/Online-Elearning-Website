import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Users, Star, BookOpen, Award, Play, ShoppingCart, CheckCircle, Sparkles, ArrowUpCircle, Tag, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { getYouTubeEmbedUrl } from '../lib/video';
import { useAuthStore } from '../stores/useAuthStore';
import { ModuleAccordion } from '../components/ModuleAccordion';
import { ReviewSection } from '../components/ReviewSection';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
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

type PreviewContent = {
    id: number;
    title: string;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE' | 'ASSIGNMENT';
    videoUrl?: string | null;
    documentUrl?: string | null;
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
    const [promotionCode, setPromotionCode] = useState('');
    const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
    const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
    const [appliedPromotion, setAppliedPromotion] = useState<{
        code: string;
        discountAmount: number;
        discountedPrice: number;
    } | null>(null);
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);

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

    // Validate promotion code
    const validatePromotion = async (code: string, price: number) => {
        if (!code.trim()) {
            return null;
        }

        try {
            setIsValidatingPromo(true);
            const { data } = await apiClient.post('/promotions/validate', { code: code.toUpperCase(), price });
            return data;
        } catch (error: any) {
            showErrorAlert('Lỗi!', error.response?.data?.error || 'Mã khuyến mãi không hợp lệ.');
            return null;
        } finally {
            setIsValidatingPromo(false);
        }
    };

    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            showErrorAlert('Lỗi!', 'Vui lòng nhập mã khuyến mãi.');
            return;
        }

        if (!course) {
            return;
        }

        const result = await validatePromotion(promotionCode, course.price);
        if (result) {
            setAppliedPromotion({
                code: result.promotion.code,
                discountAmount: result.discountAmount,
                discountedPrice: result.discountedPrice,
            });
            showSuccessAlert('Thành công!', `Áp dụng mã khuyến mãi "${result.promotion.code}" thành công.`);
        }
    };

    const handleRemovePromotion = () => {
        setAppliedPromotion(null);
        setPromotionCode('');
    };

    const enrollMutation = useMutation({
        mutationFn: async (courseId: number) => {
            const { data } = await apiClient.post(`/enroll/checkout/${courseId}`, {
                promotionCode: appliedPromotion?.code || undefined,
            });
            return data;
        },
        onSuccess: async (data) => {
            Swal.close();
            if (data.url) {
                // Check if it's a local URL (free course) or Stripe URL
                if (data.url.includes('localhost') || data.url.includes('payment-success')) {
                    // Free course - navigate to success page
                    await showSuccessAlert('Đăng ký thành công!', 'Bạn đã đăng ký khóa học miễn phí thành công.');
                    navigate('/my-courses');
                } else {
                    // Paid course - redirect to Stripe checkout
                    window.location.href = data.url;
                }
            } else {
                // Fallback - refresh to show enrollment
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

    const handleContentClick = async (contentId: number) => {
        const courseId = course?.courseId || course?.id;
        if (!courseId) return;

        if (hasFullEnrollment) {
            navigate(`/learning/${courseId}`);
            return;
        }

        try {
            setPreviewLoadingId(contentId);
            const { data } = await apiClient.get<PreviewContent>(`/courses/${courseId}/preview/${contentId}`);
            setPreviewContent(data);
        } catch (error: any) {
            showErrorAlert(
                'Nội dung bị khóa',
                error.response?.data?.error || 'Bài học này cần đăng ký hoặc mua khóa học để xem.',
            );
        } finally {
            setPreviewLoadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div>
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
                        <div className="aspect-video bg-zinc-200 dark:bg-zinc-700 rounded-lg"></div>
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

    const isTrialEnrollment = enrollment?.type === 'TRIAL';
    const hasFullEnrollment = !!enrollment && !isTrialEnrollment;
    const isEnrolled = !!enrollment;
    const isTrial = enrollment?.type === 'TRIAL';
    const trialOffered = typeof course.trialDurationDays === 'number' && course.trialDurationDays > 0;
    const showTrialButton = !isEnrolled && trialOffered && (user?.role === 'STUDENT' || !isAuthenticated);
    const showUpgradeButton = isTrial && course.price > 0;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            {/* Hero Section */}
            <section className="bg-red-600 dark:bg-red-700 text-white">
                <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-start md:items-center">
                            <div className="space-y-4 sm:space-y-6 order-2 md:order-1">
                                {/* Category Badge */}
                                <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs sm:text-sm font-medium">
                                    {course.category.name}
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight break-words">
                                    {course.title}
                                </h1>

                                {/* Description */}
                                <p className="text-blue-100 text-sm sm:text-base lg:text-lg break-words">
                                    {course.description}
                                </p>

                                {/* Teacher & Stats */}
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <Link
                                        to={`/teachers/${course.teacher.id || course.teacher.userId}`}
                                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 font-semibold">
                                            {teacherName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-blue-100 text-xs">Giảng viên</p>
                                            <p className="font-semibold hover:underline">{teacherName}</p>
                                        </div>
                                    </Link>

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
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        {appliedPromotion ? (
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                <div className="text-xl sm:text-2xl line-through text-zinc-400">
                                                    {formattedPrice}
                                                </div>
                                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">
                                                    {new Intl.NumberFormat('vi-VN', {
                                                        style: 'currency',
                                                        currency: 'VND',
                                                    }).format(appliedPromotion.discountedPrice)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">
                                                {course.price === 0 ? 'Miễn phí' : formattedPrice}
                                            </div>
                                        )}
                                    </div>

                                    {/* Promotion Code */}
                                    {course.price > 0 && (
                                        <div className="space-y-2">
                                            {appliedPromotion ? (
                                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                                    <Tag className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                                                            Mã: {appliedPromotion.code}
                                                        </div>
                                                        <div className="text-xs text-red-700 dark:text-red-300">
                                                            Giảm {new Intl.NumberFormat('vi-VN', {
                                                                style: 'currency',
                                                                currency: 'VND',
                                                            }).format(appliedPromotion.discountAmount)}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleRemovePromotion}
                                                        className="text-red-600 hover:text-red-700 dark:text-red-400 shrink-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder="Nhập mã khuyến mãi"
                                                        value={promotionCode}
                                                        onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                                        className="flex-1 uppercase"
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleApplyPromotion();
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        onClick={handleApplyPromotion}
                                                        disabled={isValidatingPromo || !promotionCode.trim()}
                                                        variant="outline"
                                                        className="gap-2 sm:shrink-0"
                                                    >
                                                        <Tag className="w-4 h-4" />
                                                        {isValidatingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Thumbnail */}
                            <div className="relative order-1 md:order-2">
                                <Card className="overflow-hidden border-4 border-white/20">
                                    {course.thumbnailUrl ? (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-full aspect-video object-cover"
                                        />
                                    ) : (
                                        <div className="w-full aspect-video bg-red-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <BookOpen className="h-24 w-24 text-zinc-300 dark:text-zinc-600" />
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
            <section className="py-8 sm:py-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                                {/* What you'll learn */}
                                <Card className="p-4 sm:p-6 border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                                        Bạn sẽ học được gì?
                                    </h2>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            'Nắm vững kiến thức cơ bản',
                                            'Thực hành qua các bài tập',
                                            'Áp dụng vào dự án thực tế',
                                            'Nhận chứng chỉ hoàn thành'
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-zinc-700 dark:text-zinc-300">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Course Content */}
                                <Card className="p-4 sm:p-6 border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                                        Nội dung khóa học
                                    </h2>
                                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-4 sm:mb-6">
                                        {course.modules.length} chương • {totalLessons} bài học
                                        {totalDuration > 0 && ` • ${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`}
                                    </p>

                                    <ModuleAccordion
                                        modules={course.modules}
                                        isEnrolled={hasFullEnrollment}
                                        onContentClick={handleContentClick}
                                    />
                                    {previewLoadingId && (
                                        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                            Đang tải bài học xem thử...
                                        </p>
                                    )}
                                    {previewContent && (
                                        <Card className="mt-6 overflow-hidden border-green-200 dark:border-green-900">
                                            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-green-600 dark:text-green-400">
                                                        Bài học miễn phí
                                                    </p>
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                                                        {previewContent.title}
                                                    </h3>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPreviewContent(null)}
                                                >
                                                    Đóng
                                                </Button>
                                            </div>
                                            {previewContent.contentType === 'VIDEO' && previewContent.videoUrl ? (
                                                <div className="aspect-video bg-black">
                                                    {getYouTubeEmbedUrl(previewContent.videoUrl) ? (
                                                        <iframe
                                                            src={getYouTubeEmbedUrl(previewContent.videoUrl) || undefined}
                                                            title={previewContent.title}
                                                            className="h-full w-full"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        />
                                                    ) : (
                                                        <video
                                                            src={previewContent.videoUrl}
                                                            controls
                                                            className="h-full w-full"
                                                        />
                                                    )}
                                                </div>
                                            ) : previewContent.contentType === 'DOCUMENT' && previewContent.documentUrl ? (
                                                <div className="p-4">
                                                    <a
                                                        href={previewContent.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-red-600 hover:underline dark:text-red-400"
                                                    >
                                                        Mở tài liệu xem thử
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                    Bài học xem thử này chưa có tài nguyên hiển thị.
                                                </div>
                                            )}
                                        </Card>
                                    )}
                                </Card>

                                {/* Reviews Section */}
                                <div className="mt-8">
                                    <ReviewSection
                                        courseId={parseInt(id!)}
                                        isEnrolled={isEnrolled}
                                    />
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Course includes */}
                                <Card className="p-4 sm:p-6 border-zinc-200 dark:border-zinc-800">
                                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                                        Khóa học bao gồm
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Clock className="h-5 w-5 text-zinc-400" />
                                            <span>Truy cập trọn đời</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <BookOpen className="h-5 w-5 text-zinc-400" />
                                            <span>{totalLessons} bài học</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Award className="h-5 w-5 text-zinc-400" />
                                            <span>Chứng chỉ hoàn thành</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Users className="h-5 w-5 text-zinc-400" />
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

