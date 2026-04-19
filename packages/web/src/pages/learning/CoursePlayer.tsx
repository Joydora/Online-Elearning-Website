import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, FileText, HelpCircle, Menu, Sparkles, ArrowUpCircle, Clock, Code2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { showErrorAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';
import { PracticePanel } from '../../components/PracticePanel';

type Content = {
    contentId?: number;
    id?: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';
    videoUrl?: string | null;
    documentUrl?: string | null;
    durationInSeconds?: number | null;
};

type Module = {
    moduleId?: number;
    id?: number;
    title: string;
    order: number;
    contents: Content[];
};

type CourseData = {
    id?: number;
    courseId?: number;
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
    useQueryClient();

    const [currentModuleId, setCurrentModuleId] = useState<number | null>(null);
    const [currentContentId, setCurrentContentId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);

    // Fetch course data
    const {
        data: course,
        isLoading: courseLoading,
    } = useQuery<CourseData>({
        queryKey: ['course', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    // Fetch enrollment status
    const {
        data: enrollment,
    } = useQuery<Enrollment>({
        queryKey: ['enrollment', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/enroll/my-enrollments`);
            const enroll = data.find((e: any) => (e.course.courseId || e.course.id) === parseInt(courseId!));
            return enroll;
        },
        enabled: !!courseId,
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Đang tải khóa học...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-600">Không tìm thấy khóa học</p>
            </div>
        );
    }

    if (!enrollment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Bạn chưa đăng ký khóa học này</p>
                    <Button onClick={() => navigate(`/courses/${courseId}`)}>
                        Quay lại trang khóa học
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="text-slate-300 hover:text-white"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold text-white">
                                    {course.title}
                                </h1>
                                <p className="text-sm text-slate-400">
                                    {currentModule?.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">
                                Tiến độ: {enrollment.progress.toFixed(0)}%
                            </span>
                            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                    style={{ width: `${enrollment.progress}%` }}
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
                <div className="flex-1 flex items-center justify-center bg-black">
                    {currentContent && (
                        <div className="w-full h-full">
                            {currentContent.contentType === 'VIDEO' && currentContent.videoUrl && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <video
                                        key={currentContent.videoUrl}
                                        controls
                                        className="w-full h-full"
                                        src={currentContent.videoUrl}
                                    >
                                        Trình duyệt của bạn không hỗ trợ video.
                                    </video>
                                </div>
                            )}

                            {currentContent.contentType === 'DOCUMENT' && currentContent.documentUrl && (
                                <div className="w-full h-full flex items-center justify-center p-8">
                                    <Card className="w-full max-w-4xl p-8 bg-white dark:bg-slate-800">
                                        <h2 className="text-2xl font-bold mb-4">{currentContent.title}</h2>
                                        <div className="prose dark:prose-invert max-w-none">
                                            <p>Tài liệu: <a href={currentContent.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">Tải xuống</a></p>
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
                                        <Button>Bắt đầu làm bài</Button>
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
                <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
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
                            <p className="text-sm text-slate-400">{currentContent?.contentType}</p>
                        </div>

                        <Button
                            onClick={handleNext}
                            disabled={!getNextContent()}
                            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
                        >
                            Bài tiếp
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Sidebar - Course Content */}
            {showSidebar && (
                <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
                    <div className="p-6">
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
                    </div>
                </div>
            )}
        </div>
    );
}
