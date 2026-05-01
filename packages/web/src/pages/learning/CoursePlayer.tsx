import { useState, useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Bot, ChevronLeft, ChevronRight, PlayCircle, FileText, HelpCircle, Menu, CheckCircle, Circle, Loader2, Send, Sparkles, BarChart2, Github, PenLine } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';

type ContentRaw = {
    id: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
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
    contentId: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
};

type Module = {
    moduleId: number;
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
    enrollmentId: number;
    progress: number;
    completionDate: string | null;
    expiresAt: string | null;
    isActive: boolean;
    type: 'TRIAL' | 'PAID' | 'FREE';
};

type PracticeData = {
    id: number;
    title: string;
    description: string;
    starterCode?: string | null;
    language: string;
};

type PracticeResult = {
    score: number;
    passed: boolean;
    aiFeedback: string;
};

// Helper to get download URL with Cloudinary attachment flag
const getDownloadUrl = (url: string): string => {
    // Add fl_attachment to Cloudinary URLs to force download
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
};

type QuizOption = {
    id: number;
    optionText: string;
};

type QuizQuestion = {
    id: number;
    questionText: string;
    options: QuizOption[];
};

type QuizData = {
    contentId: number;
    title: string;
    timeLimitInMinutes: number | null;
    questions: QuizQuestion[];
};

type QuizResult = {
    attemptId: number;
    score: number;
    correctCount: number;
    totalQuestions: number;
};

type VideoQuizMarker = {
    id: number;
    timestampSec: number;
    blockingMode: 'pause' | 'non-blocking';
    questionId: number;
    quizContentId: number;
    quizTitle: string;
    question: QuizQuestion;
};

type MarkerQuizResult = QuizResult & {
    markerId: number;
    progress?: {
        progress: number;
        isCompleted: boolean;
    };
};

type TeachingAssistantMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type QuizAttemptHistory = {
    attemptId: number;
    score: number;
    startTime: string;
    endTime: string;
};

const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com')) {
            const id = parsed.searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (parsed.hostname === 'youtu.be') {
            const id = parsed.pathname.replace('/', '').trim();
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
    } catch {
        return null;
    }
    return null;
};

export default function CoursePlayer() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
    const [currentContentId, setCurrentContentId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
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

    // Derived from state — declared here so useEffect dependency arrays don't hit the TDZ
    const currentModule = course?.modules.find(m => m.moduleId === currentModuleId);
    const currentContent = currentModule?.contents.find(c => c.contentId === currentContentId);

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
                showSuccessAlert('Chúc mừng!', 'Bạn đã hoàn thành khóa học này! 🎉');
            }
        },
        onError: () => {
            showErrorAlert('Không thể đánh dấu hoàn thành. Vui lòng thử lại.');
        },
    });

    // Function to mark current content as complete
    const markCurrentContentComplete = () => {
        if (currentContentId && !completedContentIds.includes(currentContentId)) {
            markCompleteMutation.mutate(currentContentId);
        }
    };

    // Set initial content when course data is loaded
    useEffect(() => {
        if (course && course.modules.length > 0 && !currentModuleId && !currentContentId) {
            const firstModule = course.modules[0];
            if (firstModule) {
                setCurrentModuleId(firstModule.moduleId);
                if (firstModule.contents && firstModule.contents.length > 0) {
                    setCurrentContentId(firstModule.contents[0].contentId);
                }
            }
        }
    }, [course, currentModuleId, currentContentId]);

    // Reset quiz + practice state when content changes
    useEffect(() => {
        setIsQuizStarted(false);
        setQuizData(null);
        setSelectedAnswers({});
        setQuizResult(null);
        setDocumentReadTime(0);
        setQuizAttempts([]);
        setActiveMarker(null);
        setAnsweredMarkerIds([]);
        setMarkerSelectedAnswer(null);
        setMarkerResult(null);
        setPracticeData(null);
        setPracticeCode('');
        setPracticeResult(null);
    }, [currentContentId]);

    // Load practice data when PRACTICE content is selected
    useEffect(() => {
        if (!currentContent || currentContent.contentType !== 'PRACTICE' || !currentContentId) return;
        let cancelled = false;
        setPracticeLoading(true);
        apiClient.get<PracticeData>(`/practice/content/${currentContentId}`)
            .then(({ data }) => {
                if (cancelled) return;
                setPracticeData(data);
                setPracticeCode(data.starterCode || '');
            })
            .catch(() => { if (!cancelled) showErrorAlert('Không thể tải bài thực hành.'); })
            .finally(() => { if (!cancelled) setPracticeLoading(false); });
        return () => { cancelled = true; };
    }, [currentContent, currentContentId]);

    const submitPractice = async () => {
        if (!practiceData || !practiceCode.trim()) return;
        setPracticeSubmitting(true);
        try {
            const { data } = await apiClient.post<PracticeResult>(`/practice/${practiceData.id}/submit`, { submittedCode: practiceCode });
            setPracticeResult(data);
            if (data.passed && currentContentId && !completedContentIds.includes(currentContentId)) {
                markCompleteMutation.mutate(currentContentId);
            }
        } catch {
            showErrorAlert('Không thể nộp bài thực hành. Vui lòng thử lại.');
        } finally {
            setPracticeSubmitting(false);
        }
    };

    const { data: videoMarkers = [] } = useQuery<VideoQuizMarker[]>({
        queryKey: ['content-markers', currentContentId],
        queryFn: async () => {
            const { data } = await apiClient.get<VideoQuizMarker[]>(`/contents/${currentContentId}/markers`);
            return data;
        },
        enabled: !!currentContentId && currentContent?.contentType === 'VIDEO',
    });

    // Fetch quiz attempts when viewing a quiz
    useEffect(() => {
        if (!currentContent || currentContent.contentType !== 'QUIZ' || !currentContentId) return;

        const fetchAttempts = async () => {
            try {
                const { data } = await apiClient.get<QuizAttemptHistory[]>(`/quiz/${currentContentId}/attempts`);
                setQuizAttempts(data);
            } catch (error) {
                console.error('Failed to fetch quiz attempts:', error);
            }
        };

        fetchAttempts();
    }, [currentContent, currentContentId]);

    // Auto mark document as complete after 20 seconds of viewing
    useEffect(() => {
        if (!currentContent || currentContent.contentType !== 'DOCUMENT') return;
        if (!currentContentId || completedContentIds.includes(currentContentId)) return;

        const timer = setInterval(() => {
            setDocumentReadTime(prev => {
                const newTime = prev + 1;
                // Auto complete after 20 seconds
                if (newTime >= 20 && currentContentId && !completedContentIds.includes(currentContentId)) {
                    markCompleteMutation.mutate(currentContentId);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentContent, currentContentId, completedContentIds]);

    // Quiz functions
    const startQuiz = async () => {
        if (!currentContentId) return;

        setQuizLoading(true);
        try {
            const { data } = await apiClient.get<QuizData>(`/quiz/${currentContentId}`);
            setQuizData(data);
            setIsQuizStarted(true);
            setSelectedAnswers({});
            setQuizResult(null);
        } catch (error) {
            showErrorAlert('Không thể tải bài kiểm tra. Vui lòng thử lại.');
        } finally {
            setQuizLoading(false);
        }
    };

    const handleSelectAnswer = (questionId: number, optionId: number) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: optionId,
        }));
    };

    const submitQuiz = async () => {
        if (!currentContentId || !quizData) return;

        const answers = Object.entries(selectedAnswers).map(([questionId, answerOptionId]) => ({
            questionId: parseInt(questionId),
            answerOptionId,
        }));

        if (answers.length === 0) {
            showErrorAlert('Vui lòng chọn ít nhất một câu trả lời');
            return;
        }

        setQuizLoading(true);
        try {
            const { data } = await apiClient.post<QuizResult>(`/quiz/submit/${currentContentId}`, { answers });
            setQuizResult(data);
            // Auto mark quiz as completed
            if (!completedContentIds.includes(currentContentId)) {
                markCompleteMutation.mutate(currentContentId);
            }
        } catch (error) {
            showErrorAlert('Không thể nộp bài. Vui lòng thử lại.');
        } finally {
            setQuizLoading(false);
        }
    };

    const handleVideoTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
        if (activeMarker || videoMarkers.length === 0) return;

        const currentTime = Math.floor(event.currentTarget.currentTime);
        const marker = videoMarkers.find((item) =>
            item.timestampSec <= currentTime && !answeredMarkerIds.includes(item.id)
        );

        if (!marker) return;

        setActiveMarker(marker);
        setMarkerSelectedAnswer(null);
        setMarkerResult(null);

        if (marker.blockingMode === 'pause') {
            event.currentTarget.pause();
        }
    };

    const submitMarkerAnswer = async () => {
        if (!activeMarker || markerSelectedAnswer === null) {
            showErrorAlert('Vui lòng chọn một câu trả lời');
            return;
        }

        setMarkerSubmitting(true);
        try {
            const { data } = await apiClient.post<MarkerQuizResult>(`/markers/${activeMarker.id}/submit`, {
                answerOptionId: markerSelectedAnswer,
            });
            setMarkerResult(data);
            setAnsweredMarkerIds(prev => prev.includes(activeMarker.id) ? prev : [...prev, activeMarker.id]);

            if (data.progress) {
                setCurrentProgress(data.progress.progress);
                setCompletedContentIds(prev =>
                    prev.includes(activeMarker.quizContentId) ? prev : [...prev, activeMarker.quizContentId]
                );
                queryClient.invalidateQueries({ queryKey: ['completed-contents', courseId] });
                queryClient.invalidateQueries({ queryKey: ['enrolled-course-content', courseId] });
            }
        } catch (error) {
            showErrorAlert('Không thể nộp câu trả lời trong video. Vui lòng thử lại.');
        } finally {
            setMarkerSubmitting(false);
        }
    };

    const closeMarkerQuiz = () => {
        if (activeMarker && activeMarker.blockingMode === 'non-blocking' && !markerResult) {
            setAnsweredMarkerIds(prev => prev.includes(activeMarker.id) ? prev : [...prev, activeMarker.id]);
        }

        setActiveMarker(null);
        setMarkerSelectedAnswer(null);
        setMarkerResult(null);
    };

    const askTeachingAssistant = async () => {
        const question = taQuestion.trim();

        if (!courseId || !question) return;

        const userMessage: TeachingAssistantMessage = { role: 'user', content: question };
        setTaMessages(prev => [...prev, userMessage]);
        setTaQuestion('');
        setTaLoading(true);

        try {
            const { data } = await apiClient.post<{ answer: string }>(`/ta/${courseId}/ask`, {
                question,
                currentContentId,
            });
            setTaMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
        } catch (error) {
            setTaMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Không thể kết nối AI Teaching Assistant. Vui lòng thử lại sau.',
                },
            ]);
        } finally {
            setTaLoading(false);
        }
    };

    const generateQuizSuggestions = async () => {
        if (!courseId) return;

        setTaQuizLoading(true);
        try {
            const { data } = await apiClient.post<{ suggestions: string }>(`/ta/${courseId}/quiz-suggestions`, {
                currentContentId,
            });
            setTaMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.suggestions,
                },
            ]);
        } catch (error) {
            setTaMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Không thể tạo câu hỏi gợi ý lúc này. Vui lòng thử lại sau.',
                },
            ]);
        } finally {
            setTaQuizLoading(false);
        }
    };

    const retryQuiz = () => {
        setQuizResult(null);
        setSelectedAnswers({});
    };

    const handleContentSelect = (moduleId: number, contentId: number) => {
        setCurrentModuleId(moduleId);
        setCurrentContentId(contentId);
    };

    const getNextContent = () => {
        if (!course || !currentModule || !currentContent) return null;

        const currentIndex = currentModule.contents.findIndex(c => c.contentId === currentContentId);

        // Next content in same module
        if (currentIndex < currentModule.contents.length - 1) {
            return {
                moduleId: currentModule.moduleId,
                content: currentModule.contents[currentIndex + 1]
            };
        }

        // First content of next module
        const moduleIndex = course.modules.findIndex(m => m.moduleId === currentModuleId);
        if (moduleIndex < course.modules.length - 1) {
            const nextModule = course.modules[moduleIndex + 1];
            if (nextModule.contents.length > 0) {
                return {
                    moduleId: nextModule.moduleId,
                    content: nextModule.contents[0]
                };
            }
        }

        return null;
    };

    const getPreviousContent = () => {
        if (!course || !currentModule || !currentContent) return null;

        const currentIndex = currentModule.contents.findIndex(c => c.contentId === currentContentId);

        // Previous content in same module
        if (currentIndex > 0) {
            return {
                moduleId: currentModule.moduleId,
                content: currentModule.contents[currentIndex - 1]
            };
        }

        // Last content of previous module
        const moduleIndex = course.modules.findIndex(m => m.moduleId === currentModuleId);
        if (moduleIndex > 0) {
            const prevModule = course.modules[moduleIndex - 1];
            if (prevModule.contents.length > 0) {
                return {
                    moduleId: prevModule.moduleId,
                    content: prevModule.contents[prevModule.contents.length - 1]
                };
            }
        }

        return null;
    };

    const handleNext = () => {
        const next = getNextContent();
        if (next) {
            handleContentSelect(next.moduleId, next.content.contentId);
        }
    };

    const handlePrevious = () => {
        const prev = getPreviousContent();
        if (prev) {
            handleContentSelect(prev.moduleId, prev.content.contentId);
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
                return <PenLine className="h-4 w-4" />;
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
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-900">
                <div className="text-center">
                    <p className="text-red-400 mb-4">
                        {isNotEnrolled
                            ? 'Bạn chưa đăng ký khóa học này'
                            : 'Không tìm thấy khóa học hoặc có lỗi xảy ra'}
                    </p>
                    <Button onClick={() => navigate(`/courses/${courseId}`)}>
                        Quay lại trang khóa học
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
        <div className="flex h-screen bg-zinc-900">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Expiry Banner (EPIC 2) */}
                {expiryBanner && (
                    <div className={`${expiryBanner.color} text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2`}>
                        <span>{expiryBanner.text}</span>
                        {expiryBanner.daysLeft > 0 && (
                            <a href={`/courses/${courseId}`} className="underline font-semibold hover:opacity-80">
                                Gia hạn ngay
                            </a>
                        )}
                    </div>
                )}
                {/* Top Bar */}
                <div className="bg-zinc-800 border-b border-zinc-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="text-zinc-300 hover:text-white"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    {course.title}
                                </h1>
                                <p className="text-sm text-zinc-400">
                                    {currentModule?.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
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
                            <span className="text-sm text-zinc-400">
                                {currentProgress}%
                            </span>
                            <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all"
                                    style={{ width: `${currentProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video/Content Player */}
                <div className="flex-1 flex items-center justify-center bg-black">
                    {currentContent && (
                        <div className="w-full h-full">
                            {currentContent.contentType === 'VIDEO' && currentContent.videoUrl && (
                                <div className="w-full h-full flex flex-col">
                                    <div className="flex-1 flex items-center justify-center relative">
                                        {getYouTubeEmbedUrl(currentContent.videoUrl) ? (
                                            <iframe
                                                key={currentContent.videoUrl}
                                                className="w-full h-full"
                                                src={getYouTubeEmbedUrl(currentContent.videoUrl) || undefined}
                                                title={currentContent.title}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <video
                                                key={currentContent.videoUrl}
                                                ref={videoRef}
                                                controls
                                                className="w-full h-full"
                                                src={currentContent.videoUrl}
                                                onTimeUpdate={handleVideoTimeUpdate}
                                                onEnded={markCurrentContentComplete}
                                            >
                                                Trình duyệt của bạn không hỗ trợ video.
                                            </video>
                                        )}
                                        {activeMarker && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-6 z-10">
                                                <Card className="w-full max-w-2xl p-6 bg-white dark:bg-zinc-800">
                                                    <div className="mb-4">
                                                        <p className="text-sm text-red-500 font-medium mb-1">
                                                            Quiz trong video - {activeMarker.quizTitle}
                                                        </p>
                                                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                                            {activeMarker.question.questionText}
                                                        </h2>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {activeMarker.question.options.map((option) => (
                                                            <label
                                                                key={option.id}
                                                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${markerSelectedAnswer === option.id
                                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`marker-question-${activeMarker.question.id}`}
                                                                    checked={markerSelectedAnswer === option.id}
                                                                    onChange={() => setMarkerSelectedAnswer(option.id)}
                                                                    disabled={!!markerResult}
                                                                    className="mr-3"
                                                                />
                                                                <span className="text-zinc-700 dark:text-zinc-300">
                                                                    {option.optionText}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>

                                                    {markerResult && (
                                                        <div className={`mt-4 p-3 rounded-lg ${markerResult.score === 100
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                            }`}>
                                                            {markerResult.score === 100
                                                                ? 'Chính xác! Kết quả đã được lưu.'
                                                                : 'Chưa chính xác. Kết quả đã được lưu.'}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end gap-3 mt-6">
                                                        {activeMarker.blockingMode === 'non-blocking' && !markerResult && (
                                                            <Button variant="outline" onClick={closeMarkerQuiz}>
                                                                Để sau
                                                            </Button>
                                                        )}
                                                        {!markerResult ? (
                                                            <Button
                                                                onClick={submitMarkerAnswer}
                                                                disabled={markerSubmitting || markerSelectedAnswer === null}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                {markerSubmitting ? 'Đang nộp...' : 'Nộp câu trả lời'}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => {
                                                                    closeMarkerQuiz();
                                                                    videoRef.current?.play();
                                                                }}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Tiếp tục video
                                                            </Button>
                                                        )}
                                                    </div>
                                                </Card>
                                            </div>
                                        )}
                                    </div>
                                    {/* Video action bar */}
                                    <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between">
                                        <span className="text-zinc-300 text-sm">{currentContent.title}</span>
                                        <Button
                                            size="sm"
                                            onClick={markCurrentContentComplete}
                                            disabled={completedContentIds.includes(currentContent.contentId) || markCompleteMutation.isPending}
                                            className={completedContentIds.includes(currentContent.contentId)
                                                ? 'bg-green-600 hover:bg-green-600 cursor-default'
                                                : 'bg-blue-600 hover:bg-blue-700'}
                                        >
                                            {completedContentIds.includes(currentContent.contentId) ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Đã hoàn thành
                                                </>
                                            ) : (
                                                <>
                                                    <Circle className="w-4 h-4 mr-2" />
                                                    Đánh dấu hoàn thành
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {currentContent.contentType === 'DOCUMENT' && currentContent.documentUrl && (() => {
                                const docUrl = currentContent.documentUrl;
                                const isPdf = docUrl.toLowerCase().endsWith('.pdf');

                                return (
                                    <div className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-900">
                                        {/* Document Header */}
                                        <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3 flex items-center justify-between">
                                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                                {currentContent.title}
                                            </h2>
                                            <div className="flex gap-2 items-center">
                                                {/* Auto-complete countdown */}
                                                {!completedContentIds.includes(currentContent.contentId) && documentReadTime < 20 && (
                                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                                        Tự động hoàn thành sau {20 - documentReadTime}s
                                                    </span>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={markCurrentContentComplete}
                                                    disabled={completedContentIds.includes(currentContent.contentId) || markCompleteMutation.isPending}
                                                    className={completedContentIds.includes(currentContent.contentId)
                                                        ? 'bg-green-600 hover:bg-green-600 cursor-default'
                                                        : 'bg-red-600 hover:bg-red-700'}
                                                >
                                                    {completedContentIds.includes(currentContent.contentId) ? (
                                                        <>
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                            Đã hoàn thành
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle className="w-4 h-4 mr-2" />
                                                            Đánh dấu hoàn thành
                                                        </>
                                                    )}
                                                </Button>
                                                <a
                                                    href={docUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                                >
                                                    Mở trong tab mới
                                                </a>
                                                <a
                                                    href={getDownloadUrl(docUrl)}
                                                    download
                                                    className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                                                >
                                                    Tải xuống
                                                </a>
                                            </div>
                                        </div>
                                        {/* Document Viewer - embed PDF directly */}
                                        <div className="flex-1 p-4">
                                            {isPdf ? (
                                                <object
                                                    data={docUrl}
                                                    type="application/pdf"
                                                    className="w-full h-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white"
                                                >
                                                    {/* Fallback if browser can't display PDF inline */}
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Card className="p-8 bg-white dark:bg-zinc-800 text-center">
                                                            <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
                                                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                                                                {currentContent.title}
                                                            </h3>
                                                            <p className="text-zinc-500 mb-4">
                                                                Không thể hiển thị PDF trực tiếp. Vui lòng mở trong tab mới hoặc tải xuống.
                                                            </p>
                                                            <div className="flex gap-2 justify-center">
                                                                <a
                                                                    href={docUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                    Mở trong tab mới
                                                                </a>
                                                                <a
                                                                    href={getDownloadUrl(docUrl)}
                                                                    download
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                    Tải xuống
                                                                </a>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                </object>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Card className="p-8 bg-white dark:bg-zinc-800 text-center">
                                                        <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
                                                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                                                            {currentContent.title}
                                                        </h3>
                                                        <p className="text-zinc-500 mb-4">
                                                            Loại tài liệu này cần tải xuống để xem
                                                        </p>
                                                        <a
                                                            href={getDownloadUrl(docUrl)}
                                                            download
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Tải xuống tài liệu
                                                        </a>
                                                    </Card>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {currentContent.contentType === 'QUIZ' && (
                                <div className="w-full h-full flex items-center justify-center p-8 overflow-y-auto">
                                    {/* Quiz Start Screen */}
                                    {!isQuizStarted && !quizResult && (
                                        <Card className="w-full max-w-2xl p-8 bg-white dark:bg-zinc-800">
                                            <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">
                                                Bài kiểm tra: {currentContent.title}
                                            </h2>
                                            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                                                Nhấn nút bên dưới để bắt đầu làm bài kiểm tra
                                            </p>

                                            {/* Previous Attempts */}
                                            {quizAttempts.length > 0 && (
                                                <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                                                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        Lịch sử làm bài ({quizAttempts.length} lần)
                                                    </h3>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {quizAttempts.slice(0, 5).map((attempt, index) => (
                                                            <div
                                                                key={attempt.attemptId}
                                                                className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700"
                                                            >
                                                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                                    Lần {quizAttempts.length - index} - {new Date(attempt.endTime).toLocaleDateString('vi-VN', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                                <span className={`text-sm font-bold ${attempt.score >= 80 ? 'text-green-500' :
                                                                    attempt.score >= 60 ? 'text-yellow-500' : 'text-red-500'
                                                                    }`}>
                                                                    {attempt.score}%
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-zinc-600 dark:text-zinc-400">Điểm cao nhất:</span>
                                                            <span className="font-bold text-green-500">
                                                                {quizAttempts.length > 0 ? Math.max(...quizAttempts.map(a => a.score)) : 0}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-sm mt-1">
                                                            <span className="text-zinc-600 dark:text-zinc-400">Điểm trung bình:</span>
                                                            <span className="font-semibold text-red-500">
                                                                {(quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                onClick={startQuiz}
                                                disabled={quizLoading}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {quizLoading ? 'Đang tải...' : quizAttempts.length > 0 ? 'Làm lại bài kiểm tra' : 'Bắt đầu làm bài'}
                                            </Button>
                                        </Card>
                                    )}

                                    {/* Quiz Questions */}
                                    {isQuizStarted && quizData && !quizResult && (
                                        <Card className="w-full max-w-3xl p-8 bg-white dark:bg-zinc-800 max-h-full overflow-y-auto">
                                            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">
                                                {quizData.title}
                                            </h2>
                                            {quizData.timeLimitInMinutes && (
                                                <p className="text-sm text-orange-500 mb-4">
                                                    Thời gian: {quizData.timeLimitInMinutes} phút
                                                </p>
                                            )}
                                            <p className="text-zinc-500 mb-6">
                                                {quizData.questions.length} câu hỏi
                                            </p>

                                            <div className="space-y-6">
                                                {quizData.questions.map((question, qIndex) => (
                                                    <div key={question.id} className="border-b border-zinc-200 dark:border-zinc-700 pb-6 last:border-0">
                                                        <h3 className="font-medium text-zinc-900 dark:text-white mb-4">
                                                            Câu {qIndex + 1}: {question.questionText}
                                                        </h3>
                                                        <div className="space-y-2">
                                                            {question.options.map((option) => (
                                                                <label
                                                                    key={option.id}
                                                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedAnswers[question.id] === option.id
                                                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                                                                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name={`question-${question.id}`}
                                                                        value={option.id}
                                                                        checked={selectedAnswers[question.id] === option.id}
                                                                        onChange={() => handleSelectAnswer(question.id, option.id)}
                                                                        className="mr-3"
                                                                    />
                                                                    <span className="text-zinc-700 dark:text-zinc-300">
                                                                        {option.optionText}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-4 mt-8">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsQuizStarted(false)}
                                                >
                                                    Hủy
                                                </Button>
                                                <Button
                                                    onClick={submitQuiz}
                                                    disabled={quizLoading || Object.keys(selectedAnswers).length === 0}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {quizLoading ? 'Đang nộp...' : 'Nộp bài'}
                                                </Button>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Quiz Result */}
                                    {quizResult && (
                                        <Card className="w-full max-w-2xl p-8 bg-white dark:bg-zinc-800 text-center">
                                            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${quizResult.score >= 80
                                                ? 'bg-green-100 dark:bg-green-900/30'
                                                : quizResult.score >= 50
                                                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                                                    : 'bg-red-100 dark:bg-red-900/30'
                                                }`}>
                                                <span className={`text-3xl font-bold ${quizResult.score >= 80
                                                    ? 'text-green-600'
                                                    : quizResult.score >= 50
                                                        ? 'text-yellow-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {quizResult.score}%
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">
                                                {quizResult.score >= 80
                                                    ? 'Xuất sắc!'
                                                    : quizResult.score >= 50
                                                        ? 'Tốt lắm!'
                                                        : 'Cần cố gắng thêm'}
                                            </h2>
                                            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                                                Bạn đã trả lời đúng {quizResult.correctCount}/{quizResult.totalQuestions} câu hỏi
                                            </p>
                                            <div className="flex gap-4 justify-center">
                                                <Button
                                                    variant="outline"
                                                    onClick={retryQuiz}
                                                >
                                                    Làm lại
                                                </Button>
                                                <Button
                                                    onClick={handleNext}
                                                    disabled={!getNextContent()}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Bài tiếp theo
                                                </Button>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            )}

                            {/* EPIC 3: Practice Panel */}
                            {currentContent.contentType === 'PRACTICE' && (
                                <div className="w-full h-full flex flex-col bg-zinc-900 p-6 overflow-y-auto">
                                    {practiceLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                                        </div>
                                    ) : practiceData ? (
                                        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
                                            <h2 className="text-xl font-bold text-white">{practiceData.title}</h2>
                                            <p className="text-zinc-400 text-sm whitespace-pre-wrap">{practiceData.description}</p>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-zinc-300 text-sm font-medium">
                                                    Code ({practiceData.language})
                                                </label>
                                                <textarea
                                                    className="w-full h-64 bg-zinc-800 text-zinc-100 font-mono text-sm rounded-lg border border-zinc-700 p-4 resize-y focus:outline-none focus:border-red-500"
                                                    value={practiceCode}
                                                    onChange={(e) => setPracticeCode(e.target.value)}
                                                    placeholder="Viết code của bạn tại đây..."
                                                    spellCheck={false}
                                                />
                                            </div>
                                            {practiceResult && (
                                                <div className={`p-4 rounded-lg border ${practiceResult.passed ? 'border-green-600 bg-green-900/20' : 'border-yellow-600 bg-yellow-900/20'}`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {practiceResult.passed ? (
                                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-yellow-400" />
                                                        )}
                                                        <span className={`font-bold ${practiceResult.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {practiceResult.passed ? 'Đạt' : 'Chưa đạt'} — {practiceResult.score}/100 điểm
                                                        </span>
                                                    </div>
                                                    <p className="text-zinc-300 text-sm whitespace-pre-wrap">{practiceResult.aiFeedback}</p>
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <Button
                                                    onClick={submitPractice}
                                                    disabled={practiceSubmitting || !practiceCode.trim()}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    {practiceSubmitting ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang chấm bài...</>
                                                    ) : (
                                                        <><Send className="w-4 h-4 mr-2" />Nộp bài</>
                                                    )}
                                                </Button>
                                                {practiceResult && (
                                                    <Button variant="outline" onClick={() => setPracticeResult(null)}>
                                                        Làm lại
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-zinc-500">
                                            Không tìm thấy bài thực hành
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation Bar */}
                <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={!getPreviousContent()}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Bài trước
                        </Button>

                        <div className="text-center">
                            <h3 className="text-white font-medium">{currentContent?.title}</h3>
                            <p className="text-sm text-zinc-400">{currentContent?.contentType}</p>
                        </div>

                        <Button
                            onClick={handleNext}
                            disabled={!getNextContent()}
                            className="gap-2 bg-red-600 hover:bg-red-700"
                        >
                            Bài tiếp
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sidebar - Course Content */}
            {showSidebar && (
                <div className="w-96 bg-zinc-800 border-l border-zinc-700 overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            Nội dung khóa học
                        </h2>

                        <div className="space-y-2">
                            {course.modules.map((module) => (
                                <div key={module.moduleId}>
                                    <div className="px-4 py-2 bg-zinc-700 rounded-lg text-white font-medium mb-2">
                                        {module.title}
                                    </div>
                                    <div className="space-y-1">
                                        {module.contents.map((content) => {
                                            const isCompleted = completedContentIds.includes(content.contentId);
                                            return (
                                                <button
                                                    key={content.contentId}
                                                    onClick={() => handleContentSelect(module.moduleId, content.contentId)}
                                                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${currentContentId === content.contentId
                                                        ? 'bg-red-600 text-white'
                                                        : isCompleted
                                                            ? 'text-green-400 hover:bg-zinc-700'
                                                            : 'text-zinc-300 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    <div className={isCompleted ? 'text-green-400' : 'text-zinc-400'}>
                                                        {isCompleted ? (
                                                            <CheckCircle className="h-4 w-4" />
                                                        ) : (
                                                            getContentIcon(content.contentType)
                                                        )}
                                                    </div>
                                                    <span className="flex-1 text-sm">{content.title}</span>
                                                    {currentContentId === content.contentId && (
                                                        <PlayCircle className="h-4 w-4" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 border-t border-zinc-700 pt-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Bot className="h-5 w-5 text-red-400" />
                                <h3 className="text-white font-semibold">AI Teaching Assistant</h3>
                            </div>
                            <p className="text-xs text-zinc-400 mb-3">
                                Hỏi AI theo syllabus khóa học và bài đang xem.
                            </p>

                            <div className="space-y-3 max-h-80 overflow-y-auto mb-3 pr-1">
                                {taMessages.length === 0 ? (
                                    <div className="text-xs text-zinc-500 bg-zinc-900/60 rounded-lg p-3">
                                        Ví dụ: "Bài này cần nhớ ý chính nào?" hoặc bấm tạo câu hỏi quiz gợi ý.
                                    </div>
                                ) : (
                                    taMessages.map((message, index) => (
                                        <div
                                            key={`${message.role}-${index}`}
                                            className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${message.role === 'user'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-zinc-900 text-zinc-200 border border-zinc-700'
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
                            </div>

                            <div className="flex gap-2 mb-2">
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
                                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    disabled={taLoading}
                                />
                                <Button
                                    size="sm"
                                    onClick={askTeachingAssistant}
                                    disabled={taLoading || !taQuestion.trim()}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button
                                size="sm"
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
                    </div>
                </div>
            )}
        </div>
    );
}

