import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, Users, Star, BookOpen, Award, Play, ShoppingCart, CheckCircle, Tag, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/useAuthStore';
import { ModuleAccordion } from '../components/ModuleAccordion';
import { ReviewSection } from '../components/ReviewSection';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { showErrorAlert, showSuccessAlert, showLoadingAlert } from '../lib/sweetalert';
import Swal from 'sweetalert2';

type Content = {
    id?: number;
    contentId?: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE' | 'ASSIGNMENT';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
    isFreePreview?: boolean;
};

type Module = {
    id?: number;
    moduleId?: number;
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
    thumbnailUrl?: string;
    trialDurationDays?: number | null;
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
    type: 'TRIAL' | 'PAID' | 'FREE';
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
                return data.find((e: any) => (e.course.courseId || e.course.id) === parseInt(id!));
            } catch {
                return null;
            }
        },
        enabled: isAuthenticated && user?.role === 'STUDENT' && !!id,
    });

    // Fetch referrals info for referral code
    const { data: referralData } = useQuery({
        queryKey: ['referrals-info-course-detail'],
        queryFn: async () => {
            const { data } = await apiClient.get('/users/referrals');
            return data;
        },
        enabled: isAuthenticated && user?.role === 'STUDENT',
    });

    // Validate promotion code
    const validatePromotion = async (code: string, price: number, courseId?: number) => {
        if (!code.trim()) {
            return null;
        }

        try {
            setIsValidatingPromo(true);
            const { data } = await apiClient.post('/promotions/validate', { 
                code: code.toUpperCase(), 
                price,
                courseId
            });
            return data;
        } catch (error: any) {
            showErrorAlert('Error!', error.response?.data?.error || 'Invalid promotion code.');
            return null;
        } finally {
            setIsValidatingPromo(false);
        }
    };

    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            showErrorAlert('Error!', 'Please enter a promotion code.');
            return;
        }

        if (!course) {
            return;
        }

        const courseId = course.courseId || course.id;
        const result = await validatePromotion(promotionCode, course.price, courseId);
        if (result) {
            setAppliedPromotion({
                code: result.promotion.code,
                discountAmount: result.discountAmount,
                discountedPrice: result.discountedPrice,
            });
            showSuccessAlert('Success!', `Promotion code "${result.promotion.code}" applied successfully.`);
        }
    };

    const handleRemovePromotion = () => {
        setAppliedPromotion(null);
        setPromotionCode('');
    };

    const trialMutation = useMutation({
        mutationFn: async (courseId: number) => {
            const { data } = await apiClient.post(`/enroll/trial/${courseId}`);
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert('Trial enrollment successful!', course?.trialDurationDays != null ? `You have ${course.trialDurationDays} days of free trial.` : 'Happy learning!');
            navigate(`/learning/${course?.courseId || course?.id}`);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || 'Could not enroll in trial.';
            showErrorAlert('Error', msg);
        },
    });

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
                    await showSuccessAlert('Enrolled successfully!', 'You have successfully enrolled in this free course.');
                    navigate('/my-courses');
                } else {
                    // Paid course - redirect to Stripe checkout
                    window.location.href = data.url;
                }
            } else {
                // Fallback - refresh to show enrollment
                await showSuccessAlert('Enrolled successfully!', 'You have successfully enrolled in this course.');
                window.location.reload();
            }
        },
        onError: (error: any) => {
            Swal.close();
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Could not create checkout session. Please try again.';
            showErrorAlert('Payment error', errorMessage);
        },
    });

    const handleEnroll = async () => {
        if (!isAuthenticated) {
            const result = await showErrorAlert(
                'Not logged in',
                'You need to log in to enroll in the course.'
            );
            if (result.isConfirmed) {
                navigate('/login');
            }
            return;
        }

        if (user?.role !== 'STUDENT') {
            showErrorAlert('Error', 'Only students can enroll in courses.');
            return;
        }

        if (!course) return;

        const courseId = course.courseId || course.id;
        if (!courseId) return;

        if (course.price === 0) {
            // Free course - enroll directly
            showLoadingAlert('Enrolling in course...');
            enrollMutation.mutate(courseId);
        } else {
            // Paid course - go to Stripe
            showLoadingAlert('Redirecting to checkout page...');
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
                'Locked Content',
                error.response?.data?.error || 'This lesson requires enrolling or purchasing the course.',
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
                <p className="text-red-600 dark:text-red-400">Course not found</p>
                <Link to="/">
                    <Button className="mt-4">Back to home</Button>
                </Link>
            </div>
        );
    }

    const teacherName = [course.teacher.firstName, course.teacher.lastName]
        .filter(Boolean)
        .join(' ') || course.teacher.username;

    const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(course.price);

    const totalLessons = course.modules.reduce((acc, module) => acc + module.contents.length, 0);
    const totalDuration = course.modules.reduce((acc, module) =>
        acc + module.contents.reduce((sum, content) => sum + (content.durationInSeconds || 0), 0), 0
    );

    const isTrialEnrollment = enrollment?.type === 'TRIAL';
    const hasFullEnrollment = !!enrollment && !isTrialEnrollment;
    const isEnrolled = !!enrollment;

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
                                <p className="text-blue-100 text-sm sm:text-base lg:text-lg break-words whitespace-pre-wrap leading-relaxed">
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
                                            <p className="text-blue-100 text-xs">Teacher</p>
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
                                            <span>{course.totalEnrollments} students</span>
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
                                                    {new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                    }).format(appliedPromotion.discountedPrice)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">
                                                {course.price === 0 ? 'Free' : formattedPrice}
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
                                                            Code: {appliedPromotion.code}
                                                        </div>
                                                        <div className="text-xs text-red-700 dark:text-red-300">
                                                            Discount {new Intl.NumberFormat('en-US', {
                                                                style: 'currency',
                                                                currency: 'USD',
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
                                                        placeholder="Enter promotion code"
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
                                                        {isValidatingPromo ? 'Validating...' : 'Apply'}
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

                                {/* Enroll Button */}
                                <div className="mt-4 sm:mt-6 space-y-3">
                                    {isEnrolled ? (
                                        <Button
                                            size="lg"
                                            onClick={handleStartLearning}
                                            className="w-full bg-white text-blue-600 hover:bg-blue-50 text-base sm:text-lg h-12 sm:h-14"
                                        >
                                            <Play className="mr-2 h-5 w-5" />
                                            {isTrialEnrollment ? 'Continue Trial' : 'Start Learning'}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                size="lg"
                                                onClick={handleEnroll}
                                                disabled={enrollMutation.isPending}
                                                className="w-full bg-white text-blue-600 hover:bg-blue-50 text-base sm:text-lg h-12 sm:h-14"
                                            >
                                                {enrollMutation.isPending ? (
                                                    <>Processing...</>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                                        {course.price === 0 ? 'Enroll Now' : 'Buy Course'}
                                                    </>
                                                )}
                                            </Button>
                                            {course.trialDurationDays && (
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (!isAuthenticated) {
                                                            navigate('/login');
                                                            return;
                                                        }
                                                        const courseId = course.courseId || course.id;
                                                        if (courseId) trialMutation.mutate(courseId);
                                                     }}
                                                     disabled={trialMutation.isPending}
                                                     className="w-full border-white text-white hover:bg-white/10 text-sm sm:text-base h-11 sm:h-12"
                                                 >
                                                     <Play className="mr-2 h-4 w-4" />
                                                     {trialMutation.isPending ? 'Processing...' : `Free Trial for ${course.trialDurationDays} Days`}
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
                                        What you'll learn
                                    </h2>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[
                                            'Master the fundamentals',
                                            'Practice with exercises',
                                            'Apply to real-world projects',
                                            'Earn a completion certificate'
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
                                        Course Syllabus
                                    </h2>
                                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-4 sm:mb-6">
                                        {course.modules.length} modules • {totalLessons} lessons
                                        {totalDuration > 0 && ` • ${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`}
                                    </p>

                                    <ModuleAccordion
                                        modules={course.modules}
                                        isEnrolled={hasFullEnrollment}
                                        onContentClick={handleContentClick}
                                    />
                                    {previewLoadingId && (
                                        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                            Loading preview lesson...
                                        </p>
                                    )}
                                    {previewContent && (
                                        <Card className="mt-6 overflow-hidden border-green-200 dark:border-green-900">
                                            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-green-600 dark:text-green-400">
                                                        Free Preview
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
                                                    Close
                                                </Button>
                                            </div>
                                            {previewContent.contentType === 'VIDEO' && previewContent.videoUrl ? (
                                                <div className="aspect-video bg-black">
                                                    <video
                                                        src={previewContent.videoUrl}
                                                        controls
                                                        className="h-full w-full"
                                                    />
                                                </div>
                                            ) : previewContent.contentType === 'DOCUMENT' && previewContent.documentUrl ? (
                                                <div className="p-4">
                                                    <a
                                                        href={previewContent.documentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-red-600 hover:underline dark:text-red-400"
                                                    >
                                                        Open preview document
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                                                    This preview lesson does not have a display resource yet.
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
                                        This course includes
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Clock className="h-5 w-5 text-zinc-400" />
                                            <span>Lifetime access</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <BookOpen className="h-5 w-5 text-zinc-400" />
                                            <span>{totalLessons} lessons</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Award className="h-5 w-5 text-zinc-400" />
                                            <span>Completion certificate</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Users className="h-5 w-5 text-zinc-400" />
                                            <span>Learning community</span>
                                        </li>
                                    </ul>
                                </Card>

                                {isAuthenticated && user?.role === 'STUDENT' && referralData?.referralCode && (
                                    <Card className="p-4 sm:p-6 border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-red-50 to-amber-50 dark:from-zinc-850 dark:to-zinc-800 shadow-sm">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                                            🎁 Refer & Earn 20% Off!
                                        </h3>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
                                            Share this course with friends. When they buy, they get <strong>10% off</strong> their first purchase, and you earn a <strong>20% discount coupon</strong>!
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${window.location.origin}/courses/${course.courseId || course.id}?ref=${referralData.referralCode}`}
                                                className="text-xs bg-white dark:bg-zinc-900 border-zinc-300 focus:ring-red-500"
                                            />
                                            <Button
                                                size="sm"
                                                className="bg-red-600 hover:bg-red-700 text-white shrink-0 text-xs px-3"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/courses/${course.courseId || course.id}?ref=${referralData.referralCode}`;
                                                    navigator.clipboard.writeText(link);
                                                    showSuccessAlert('Copied!', 'Referral link copied to clipboard.');
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

