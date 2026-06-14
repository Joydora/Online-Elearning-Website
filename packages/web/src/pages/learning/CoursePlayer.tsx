import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, FileText, HelpCircle, Menu, Sparkles, ArrowUpCircle, Clock, Code2, BarChart2, Bot, Github, MessageCircle, Send, Loader2, X } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { getYouTubeEmbedUrl } from '../../lib/video';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';
import { PracticePanel } from '../../components/PracticePanel';
import { safeHttpUrl } from '../../lib/safeUrl';

type QuizQuestion = {
    questionId: number;
    question: string;
    options: { optionId: number; text: string }[];
};

type QuizData = {
    quizId: number;
    title: string;
    timeLimitInMinutes?: number | null;
    questions: QuizQuestion[];
};

type QuizResult = {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
    answers: { questionId: number; isCorrect: boolean; correctOptionId: number }[];
};

type QuizAttemptHistory = {
    attemptId: number;
    score: number;
    passed: boolean;
    createdAt: string;
};

type VideoQuizMarker = {
    markerId: number;
    timestampSeconds: number;
    question: string;
    options: { optionId: number; text: string }[];
    correctOptionId?: number;
};

type MarkerQuizResult = {
    isCorrect: boolean;
    correctOptionId: number;
};

type TeachingAssistantMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type PracticeData = {
    practiceId: number;
    title: string;
    prompt: string;
    starterCode?: string | null;
    expectedOutput?: string | null;
    language?: string | null;
};

type PracticeResult = {
    passed: boolean;
    output: string;
    feedback?: string;
};

type ContentRaw = {
    id: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE' | 'ASSIGNMENT';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
    isFreePreview?: boolean;
    isLocked?: boolean;
};

type ModuleRaw = {
    id: number;
    title: string;
    order: number;
    contents: ContentRaw[];
};

type CourseDataRaw = {
    id: number;
    title: string;
    description: string;
    modules: ModuleRaw[];
    enrollment: {
        enrollmentId: number;
        progress: number;
        completionDate: string | null;
        expiresAt: string | null;
        isActive: boolean;
        type: 'TRIAL' | 'PAID' | 'FREE';
    };
};

// Normalized types for internal use
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
    isLocked?: boolean;
};

type Module = {
    moduleId?: number;
    id?: number;
    title: string;
    order: number;
    contents: Content[];
};

type CourseData = {
    id: number;
    title: string;
    description: string;
    modules: Module[];
};

type Enrollment = {
    id?: number;
    enrollmentId?: number;
    progress: number;
    completionDate: string | null;
    type?: 'TRIAL' | 'PAID';
    expiresAt?: string | null;
    isActive?: boolean;
};

export default function CoursePlayer() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
    const [currentContentId, setCurrentContentId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(min-width: 1024px)').matches;
        }
        return true;
    });
    const [completedContentIds, setCompletedContentIds] = useState<number[]>([]);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [documentReadTime, setDocumentReadTime] = useState(0);

    // Quiz states
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizAttempts, setQuizAttempts] = useState<QuizAttemptHistory[]>([]);
    const [activeMarker, setActiveMarker] = useState<VideoQuizMarker | null>(null);
    const [answeredMarkerIds, setAnsweredMarkerIds] = useState<number[]>([]);
    const [markerSelectedAnswer, setMarkerSelectedAnswer] = useState<number | null>(null);
    const [markerResult, setMarkerResult] = useState<MarkerQuizResult | null>(null);
    const [markerSubmitting, setMarkerSubmitting] = useState(false);
    const [taMessages, setTaMessages] = useState<TeachingAssistantMessage[]>([]);
    const [taQuestion, setTaQuestion] = useState('');
    const [taLoading, setTaLoading] = useState(false);
    const [taQuizLoading, setTaQuizLoading] = useState(false);
    const [taOpen, setTaOpen] = useState(false);
    const taEndRef = useRef<HTMLDivElement | null>(null);

    // Keep the AI chat scrolled to the latest message while the overlay is open.
    useEffect(() => {
        if (taOpen) taEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [taMessages, taLoading, taQuizLoading, taOpen]);

    // Practice states
    const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
    const [practiceCode, setPracticeCode] = useState('');
    const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [practiceSubmitting, setPracticeSubmitting] = useState(false);

    // Fetch course data with content (enrolled students only)
    const {
        data: courseData,
        isLoading: courseLoading,
        error: courseError,
    } = useQuery<{ course: CourseData; enrollment: Enrollment }>({
        queryKey: ['enrolled-course-content', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get<CourseDataRaw>(`/enroll/courses/${courseId}/content`);
            // Normalize the data to use consistent field names
            const normalizedCourse: CourseData = {
                id: data.id,
                title: data.title,
                description: data.description,
                modules: data.modules.map(m => ({
                    moduleId: m.id,
                    title: m.title,
                    order: m.order,
                    contents: m.contents.map(c => ({
                        contentId: c.id,
                        title: c.title,
                        order: c.order,
                        contentType: c.contentType,
                        videoUrl: c.videoUrl,
                        documentUrl: c.documentUrl,
                        durationInSeconds: c.durationInSeconds,
                        isFreePreview: c.isFreePreview,
                        isLocked: c.isLocked,
                    })),
                })),
            };
            return {
                course: normalizedCourse,
                enrollment: data.enrollment,
            };
        },
        enabled: !!courseId,
    });

    const course = courseData?.course;
    const enrollment = courseData?.enrollment;
    const canAccessContent = (content?: Content | null) => {
        if (!content) return false;
        if (content.isLocked) return false;
        return enrollment?.type !== 'TRIAL' || !!content.isFreePreview;
    };

    // Fetch completed contents
    const { data: completedData } = useQuery<{ completedContentIds: number[] }>({
        queryKey: ['completed-contents', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/progress/course/${courseId}/completed`);
            return data;
        },
        enabled: !!courseId,
    });

    // Update completed contents when data changes
    useEffect(() => {
        if (completedData?.completedContentIds) {
            setCompletedContentIds(completedData.completedContentIds);
        }
    }, [completedData]);

    // Update progress from enrollment
    useEffect(() => {
        if (enrollment?.progress !== undefined) {
            setCurrentProgress(enrollment.progress);
        }
    }, [enrollment]);

    // Mark content as completed mutation
    const markCompleteMutation = useMutation({
        mutationFn: async (contentId: number) => {
            const { data } = await apiClient.post(`/progress/content/${contentId}/complete`);
            return data;
        },
        onSuccess: (data, contentId) => {
            setCompletedContentIds(prev => [...prev, contentId]);
            setCurrentProgress(data.progress);
            queryClient.invalidateQueries({ queryKey: ['completed-contents', courseId] });
            queryClient.invalidateQueries({ queryKey: ['enrolled-course-content', courseId] });
            if (data.isCompleted) {
                showSuccessAlert('Chúc mừng!', 'Bạn đã hoàn thành khóa học này! Chứng chỉ đã sẵn sàng trong trang Tiến độ.');
            }
        },
        onError: (error: any) => {
            const backendError = error?.response?.data?.error;
            const backendDetails = error?.response?.data?.details;
            showErrorAlert(
                backendError || 'Không thể đánh dấu hoàn thành. Vui lòng thử lại.',
                backendDetails
            );
        },
    });

    // Enrollment lifecycle derivation
    const expiresAtMs = enrollment?.expiresAt ? new Date(enrollment.expiresAt).getTime() : null;
    const nowMs = Date.now();
    const isTrial = enrollment?.type === 'TRIAL';
    const isPaid = enrollment?.type === 'PAID';
    const hasExpiry = expiresAtMs !== null;
    const isInactive = enrollment?.isActive === false;
    const isExpired = (hasExpiry && expiresAtMs <= nowMs) || isInactive;
    const daysLeft = hasExpiry
        ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / (24 * 60 * 60 * 1000)))
        : 0;

    const showTrialBanner = isTrial && !isExpired;
    const showPaidExpiryBanner = isPaid && hasExpiry && !isExpired;

    // Redirect when access has expired — trial or paid
    useEffect(() => {
        if (enrollment && isExpired) {
            showErrorAlert(
                isPaid ? 'Quyền truy cập đã hết hạn' : 'Học thử đã hết hạn',
                isPaid
                    ? 'Quyền truy cập khoá học của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục học.'
                    : 'Bạn cần nâng cấp lên bản đầy đủ để tiếp tục học khoá này.',
            );
            navigate(`/courses/${courseId}`);
        }
    }, [enrollment, isExpired, isPaid, courseId, navigate]);

    const upgradeMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/enroll/checkout/${courseId}`);
            return data as { url: string };
        },
        onSuccess: (data) => {
            Swal.close();
            if (data.url) {
                window.location.href = data.url;
            } else {
                window.location.reload();
            }
        },
        onError: (error: any) => {
            Swal.close();
            const msg =
                error.response?.data?.error ||
                error.response?.data?.details ||
                'Không thể nâng cấp. Vui lòng thử lại.';
            showErrorAlert('Lỗi nâng cấp', msg);
        },
    });

    // Set initial content once the course finishes loading. Previously this used
    // useState(() => ...) which (a) doesn't run on later renders and (b) doesn't
    // observe `course` becoming truthy, so the player was stuck without a default
    // selection. useEffect with course as dep gives us the right "init when ready"
    // behaviour without re-firing every render.
    useEffect(() => {
        if (!course) return;
        if (currentModuleId !== null && currentContentId !== null) return;
        const firstModule = course.modules[0];
        if (!firstModule) return;
        const firstModuleId = (firstModule.moduleId ?? firstModule.id) ?? null;
        if (firstModuleId !== null) setCurrentModuleId(firstModuleId);
        const firstContent = firstModule.contents[0];
        if (firstContent) {
            const firstContentId = (firstContent.contentId ?? firstContent.id) ?? null;
            if (firstContentId !== null) setCurrentContentId(firstContentId);
        }
    }, [course, currentModuleId, currentContentId]);

    const getModuleId = (m: Module) => (m.moduleId ?? m.id) as number;
    const getContentId = (c: Content) => (c.contentId ?? c.id) as number;

    const currentModule = course?.modules.find(m => getModuleId(m) === currentModuleId);
    const currentContent = currentModule?.contents.find(c => getContentId(c) === currentContentId);

    const handleContentSelect = (moduleId: number, contentId: number) => {
        setCurrentModuleId(moduleId);
        setCurrentContentId(contentId);
    };

    const getNextContent = () => {
        if (!course || !currentModule || !currentContent) return null;

        const currentIndex = currentModule.contents.findIndex(c => getContentId(c) === currentContentId);

        // Next content in same module
        if (currentIndex < currentModule.contents.length - 1) {
            return {
                moduleId: getModuleId(currentModule),
                content: currentModule.contents[currentIndex + 1]
            };
        }

        // First content of next module
        const moduleIndex = course.modules.findIndex(m => getModuleId(m) === currentModuleId);
        if (moduleIndex < course.modules.length - 1) {
            const nextModule = course.modules[moduleIndex + 1];
            if (nextModule.contents.length > 0) {
                return {
                    moduleId: getModuleId(nextModule),
                    content: nextModule.contents[0]
                };
            }
        }

        return null;
    };

    const getPreviousContent = () => {
        if (!course || !currentModule || !currentContent) return null;

        const currentIndex = currentModule.contents.findIndex(c => getContentId(c) === currentContentId);

        // Previous content in same module
        if (currentIndex > 0) {
            return {
                moduleId: getModuleId(currentModule),
                content: currentModule.contents[currentIndex - 1]
            };
        }

        // Last content of previous module
        const moduleIndex = course.modules.findIndex(m => getModuleId(m) === currentModuleId);
        if (moduleIndex > 0) {
            const prevModule = course.modules[moduleIndex - 1];
            if (prevModule.contents.length > 0) {
                return {
                    moduleId: getModuleId(prevModule),
                    content: prevModule.contents[prevModule.contents.length - 1]
                };
            }
        }

        return null;
    };

    const askTeachingAssistant = async () => {
        if (!taQuestion.trim() || taLoading) return;
        const question = taQuestion.trim();
        setTaQuestion('');
        setTaMessages(prev => [...prev, { role: 'user', content: question }]);
        setTaLoading(true);
        try {
            const { data } = await apiClient.post('/teaching-assistant/ask', {
                courseId,
                contentId: currentContentId,
                question,
                history: taMessages,
            });
            setTaMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
        } catch {
            setTaMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }]);
        } finally {
            setTaLoading(false);
        }
    };

    const generateQuizSuggestions = async () => {
        if (taQuizLoading) return;
        setTaQuizLoading(true);
        try {
            const { data } = await apiClient.post('/teaching-assistant/quiz-suggestions', {
                courseId,
                contentId: currentContentId,
            });
            setTaMessages(prev => [...prev, { role: 'assistant', content: data.suggestions }]);
        } catch {
            setTaMessages(prev => [...prev, { role: 'assistant', content: 'Không thể tạo câu hỏi gợi ý. Vui lòng thử lại.' }]);
        } finally {
            setTaQuizLoading(false);
        }
    };

    const handleNext = () => {
        const next = getNextContent();
        if (next) {
            handleContentSelect(next.moduleId, getContentId(next.content));
        }
    };

    const handlePrevious = () => {
        const prev = getPreviousContent();
        if (prev) {
            handleContentSelect(prev.moduleId, getContentId(prev.content));
        }
    };

    const getContentIcon = (contentType: Content['contentType']) => {
        switch (contentType) {
            case 'VIDEO':
                return <PlayCircle className="h-4 w-4" />;
            case 'DOCUMENT':
                return <FileText className="h-4 w-4" />;
            case 'QUIZ':
                return <HelpCircle className="h-4 w-4" />;
            case 'PRACTICE':
                return <Code2 className="h-4 w-4" />;
        }
    };

    if (courseLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-zinc-600 dark:text-zinc-400">Đang tải khóa học...</p>
                </div>
            </div>
        );
    }

    if (courseError || !course || !enrollment) {
        const isNotEnrolled = (courseError as any)?.response?.status === 403;
        const isExpired = (courseError as any)?.response?.data?.code === 'ENROLLMENT_EXPIRED';
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-900">
                <div className="text-center">
                    <p className="text-red-400 mb-4">
                        {isExpired
                            ? 'Quyền truy cập khóa học của bạn đã hết hạn'
                            : isNotEnrolled
                            ? 'Bạn chưa đăng ký khóa học này'
                            : 'Không tìm thấy khóa học hoặc có lỗi xảy ra'}
                    </p>
                    <Button onClick={() => navigate(`/courses/${courseId}`)}>
                        {isExpired ? 'Gia hạn hoặc mua lại khóa học' : 'Quay lại trang khóa học'}
                    </Button>
                </div>
            </div>
        );
    }

    // Compute expiry info for banner
    const expiryBanner = (() => {
        if (!enrollment?.expiresAt) return null;
        const msLeft = new Date(enrollment.expiresAt).getTime() - Date.now();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        if (!enrollment.isActive) return { text: 'Quyền truy cập của bạn đã hết hạn.', color: 'bg-red-700', daysLeft: 0 };
        if (daysLeft <= 7) return { text: `Còn ${daysLeft} ngày truy cập khóa học.`, color: daysLeft <= 2 ? 'bg-red-600' : 'bg-yellow-600', daysLeft };
        return null;
    })();

    return (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-zinc-900">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Expiry Banner (EPIC 2) */}
                {expiryBanner && (
                    <div className={`${expiryBanner.color} text-white text-center text-xs sm:text-sm py-2 px-3 sm:px-4 flex flex-wrap items-center justify-center gap-2`}>
                        <span>{expiryBanner.text}</span>
                        {expiryBanner.daysLeft > 0 && (
                            <a href={`/courses/${courseId}`} className="underline font-semibold hover:opacity-80">
                                Gia hạn ngay
                            </a>
                        )}
                    </div>
                )}
                {/* Top Bar */}
                <div className="bg-zinc-800 border-b border-zinc-700 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="text-zinc-300 hover:text-white shrink-0"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                                    {course.title}
                                </h1>
                                <p className="text-xs sm:text-sm text-zinc-400 truncate">
                                    {currentModule?.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Link to={`/learning/${courseId}/progress`}>
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-1 text-xs">
                                    <BarChart2 className="h-4 w-4" />
                                    Tiến độ
                                </Button>
                            </Link>
                            <Link to={`/learning/${courseId}/projects`}>
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-1 text-xs">
                                    <Github className="h-4 w-4" />
                                    Dự án
                                </Button>
                            </Link>
                            <Link to={`/learning/${courseId}/discussions`}>
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white gap-1 text-xs">
                                    <MessageCircle className="h-4 w-4" />
                                    Thảo luận
                                </Button>
                            </Link>
                            <span className="text-xs sm:text-sm text-zinc-400">
                                {currentProgress}%
                            </span>
                            <div className="w-20 sm:w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all"
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trial Banner */}
                {showTrialBanner && (
                    <div
                        data-testid="trial-banner"
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Chế độ học thử</p>
                                <p className="text-sm opacity-90">
                                    {daysLeft > 0
                                        ? `Còn ${daysLeft} ngày học thử — nâng cấp để giữ toàn quyền truy cập.`
                                        : 'Hôm nay là ngày cuối của bản học thử.'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => upgradeMutation.mutate()}
                            disabled={upgradeMutation.isPending}
                            className="bg-white text-orange-600 hover:bg-orange-50"
                            data-testid="upgrade-button"
                        >
                            {upgradeMutation.isPending ? (
                                <>Đang xử lý...</>
                            ) : (
                                <>
                                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                                    Nâng cấp ngay
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Paid-expiry Banner (no action, informational only) */}
                {showPaidExpiryBanner && (
                    <div
                        data-testid="paid-expiry-banner"
                        className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white px-6 py-3 flex items-center gap-3"
                    >
                        <Clock className="h-5 w-5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Quyền truy cập sắp hết</p>
                            <p className="text-sm opacity-90">
                                Còn {daysLeft} ngày truy cập khoá học này.
                            </p>
                        </div>
                    </div>
                )}

                {/* Video/Content Player */}
                <div className="flex-1 flex items-center justify-center bg-black min-h-[40vh] lg:min-h-0">
                    {!currentContent && (
                        <Card className="max-w-md p-6 sm:p-8 mx-3 bg-white dark:bg-zinc-800 text-center">
                            <Lock className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                            <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
                                Chưa có bài preview
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                                Khóa học thử này chưa có bài nào được mở preview. Vui lòng mua khóa học để xem toàn bộ nội dung.
                            </p>
                            <Button onClick={() => navigate(`/courses/${courseId}`)} className="bg-red-600 hover:bg-red-700">
                                Quay lại trang khóa học
                            </Button>
                        </Card>
                    )}
                    {currentContent && (
                        <div className="w-full h-full">
                            {currentContent.contentType === 'VIDEO' && safeHttpUrl(currentContent.videoUrl) && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <video
                                        key={safeHttpUrl(currentContent.videoUrl) ?? ''}
                                        controls
                                        className="w-full h-full"
                                        src={safeHttpUrl(currentContent.videoUrl) ?? undefined}
                                    >
                                        Trình duyệt của bạn không hỗ trợ video.
                                    </video>
                                </div>
                            )}

                            {currentContent.contentType === 'DOCUMENT' && safeHttpUrl(currentContent.documentUrl) && (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <Card className="w-full max-w-4xl p-8 bg-white dark:bg-slate-800">
                                        <h2 className="text-2xl font-bold mb-4">{currentContent.title}</h2>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <p>Tài liệu: <a href={safeHttpUrl(currentContent.documentUrl) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600">Tải xuống</a></p>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {currentContent.contentType === 'QUIZ' && (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <Card className="w-full max-w-2xl p-8 bg-white dark:bg-slate-800">
                                        <h2 className="text-2xl font-bold mb-4">Bài kiểm tra: {currentContent.title}</h2>
                                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                                            Bài kiểm tra sẽ được hiển thị ở đây
                                        </p>
                                        <Button onClick={() => navigate(`/courses/${courseId}`)} className="bg-red-600 hover:bg-red-700">
                                            Mua khóa học để xem tiếp
                                        </Button>
                                    </Card>
                                </div>
                            )}

                            {currentContent.contentType === 'PRACTICE' && (
                                <PracticePanel contentId={getContentId(currentContent)} />
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation Bar */}
                <div className="bg-zinc-800 border-t border-zinc-700 px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={!getPreviousContent()}
                            className="gap-1 sm:gap-2 shrink-0"
                            size="sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Bài trước</span>
                        </Button>

                        <div className="text-center min-w-0 flex-1">
                            <h3 className="text-white font-medium text-sm sm:text-base truncate">{currentContent?.title}</h3>
                            <p className="text-xs sm:text-sm text-zinc-400">{currentContent?.contentType}</p>
                        </div>

                        <Button
                            onClick={handleNext}
                            disabled={!getNextContent()}
                            className="gap-1 sm:gap-2 bg-red-600 hover:bg-red-700 shrink-0"
                            size="sm"
                        >
                            <span className="hidden sm:inline">Bài tiếp</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sidebar overlay backdrop on mobile */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setShowSidebar(false)}
                />
            )}

            {/* Sidebar - Course Content */}
            {showSidebar && (
                <div className="fixed inset-y-0 right-0 w-[88vw] max-w-sm bg-zinc-800 border-l border-zinc-700 overflow-y-auto z-50 lg:static lg:w-96 lg:max-w-none lg:flex-shrink-0">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            Nội dung khóa học
                        </h2>

                        <div className="space-y-2">
                            {course.modules.map((module) => {
                                const mid = getModuleId(module);
                                return (
                                <div key={mid}>
                                    <div className="px-4 py-2 bg-slate-700 rounded-lg text-white font-medium mb-2">
                                        {module.title}
                                    </div>
                                    <div className="space-y-1">
                                        {module.contents.map((content) => {
                                            const cid = getContentId(content);
                                            return (
                                            <button
                                                key={cid}
                                                onClick={() => handleContentSelect(mid, cid)}
                                                className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                                    currentContentId === cid
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-slate-300 hover:bg-slate-700'
                                                }`}
                                            >
                                                <div className="text-slate-400">
                                                    {getContentIcon(content.contentType)}
                                                </div>
                                                <span className="flex-1 text-sm">{content.title}</span>
                                                {currentContentId === cid && (
                                                    <PlayCircle className="h-4 w-4" />
                                                )}
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 border-t border-zinc-700 pt-6">
                            <button
                                onClick={() => setTaOpen(true)}
                                className="w-full flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-700/60 px-4 py-3 text-left transition-colors"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 text-red-400 shrink-0">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-semibold text-sm">AI Teaching Assistant</h3>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {taMessages.length > 0
                                            ? `${taMessages.length} tin nhắn · bấm để mở`
                                            : 'Hỏi AI theo bài đang xem'}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Teaching Assistant — full-size overlay */}
            {taOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/70"
                    onClick={() => setTaOpen(false)}
                >
                    <Card
                        className="flex w-full max-w-3xl h-[85vh] flex-col overflow-hidden bg-zinc-900 border-zinc-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 sm:px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 text-red-400 shrink-0">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-semibold">AI Teaching Assistant</h3>
                                    <p className="text-xs text-zinc-400 truncate">
                                        {currentContent ? `Bài đang xem: ${currentContent.title}` : 'Hỏi AI theo syllabus khóa học'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTaOpen(false)}
                                aria-label="Đóng"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5">
                            {taMessages.length === 0 ? (
                                <div className="text-sm text-zinc-500 bg-zinc-800/60 rounded-lg p-4">
                                    Ví dụ: "Bài này cần nhớ ý chính nào?" hoặc bấm tạo câu hỏi quiz gợi ý.
                                </div>
                            ) : (
                                taMessages.map((message, index) => (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className={`rounded-lg p-3 text-sm whitespace-pre-wrap break-words max-w-[85%] ${message.role === 'user'
                                            ? 'ml-auto bg-red-600 text-white'
                                            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                            }`}
                                    >
                                        {message.content}
                                    </div>
                                ))
                            )}
                            {(taLoading || taQuizLoading) && (
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    AI đang suy nghĩ...
                                </div>
                            )}
                            <div ref={taEndRef} />
                        </div>

                        {/* Input footer */}
                        <div className="border-t border-zinc-700 bg-zinc-800 p-3 sm:p-4 space-y-2">
                            <div className="flex gap-2">
                                <input
                                    value={taQuestion}
                                    onChange={(event) => setTaQuestion(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            askTeachingAssistant();
                                        }
                                    }}
                                    placeholder="Hỏi về bài này..."
                                    autoFocus
                                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    disabled={taLoading}
                                />
                                <Button
                                    onClick={askTeachingAssistant}
                                    disabled={taLoading || !taQuestion.trim()}
                                    className="bg-red-600 hover:bg-red-700 px-4"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={generateQuizSuggestions}
                                disabled={taQuizLoading}
                                className="w-full gap-2"
                            >
                                {taQuizLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Gợi ý câu hỏi quiz từ bài này
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

