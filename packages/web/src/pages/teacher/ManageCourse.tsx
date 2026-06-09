import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Video,
    FileText,
    ClipboardList,
    ChevronDown,
    ChevronRight,
    Loader2,
    Save,
    X,
    UserCheck,
    Github,
    Send,
    Sparkles,
    Eye,
    Clock
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';
import { AddContentModal } from '../../components/AddContentModal';
import { useAuthStore } from '../../stores/useAuthStore';

type Content = {
    id: number;
    title: string;
    order: number;
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE' | 'ASSIGNMENT';
    videoUrl?: string;
    durationInSeconds?: number;
    documentUrl?: string;
    fileType?: string;
    timeLimitInMinutes?: number;
    isFreePreview?: boolean;
    moduleId?: number;
};

type Module = {
    id: number;
    title: string;
    order: number;
    contents: Content[];
};

type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

type CourseDetail = {
    id: number;
    title: string;
    description: string;
    price: number;
    status?: CourseStatus;
    rejectionReason?: string | null;
    trialDurationDays?: number | null;
    accessDurationDays?: number | null;
    modules: Module[];
};

const STATUS_LABELS: Record<CourseStatus, string> = {
    DRAFT: 'Bản nháp',
    PENDING_REVIEW: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    PUBLISHED: 'Đã xuất bản',
};

const STATUS_COLORS: Record<CourseStatus, string> = {
    DRAFT: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function ManageCourse() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    // Determine if user is admin based on URL or role
    const isAdmin = user?.role === 'ADMIN' || location.pathname.startsWith('/admin');
    const dashboardPath = isAdmin ? '/admin' : '/dashboard';
    const editPath = isAdmin ? `/admin/courses/${id}/edit` : `/courses/${id}/edit`;
    const studentsPath = `/courses/${id}/students`;
    const quizManagePath = (contentId: number) => isAdmin ? `/admin/quiz/${contentId}/manage` : `/quiz/${contentId}/manage`;

    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [addingContentToModule, setAddingContentToModule] = useState<number | null>(null);
    const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
    const [editingModuleTitle, setEditingModuleTitle] = useState('');
    const [editingContent, setEditingContent] = useState<Content | null>(null);

    // Fetch course detail with modules and contents
    const { data: course, isLoading } = useQuery<CourseDetail>({
        queryKey: ['course-manage', id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${id}`);
            return data;
        },
        enabled: !!id,
    });

    // Create module mutation
    const createModuleMutation = useMutation({
        mutationFn: async (title: string) => {
            const { data } = await apiClient.post('/modules', {
                courseId: parseInt(id!),
                title,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            setIsAddingModule(false);
            setNewModuleTitle('');
            showSuccessAlert('Thêm chương thành công!', 'Chương học mới đã được tạo.');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi tạo chương', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    // Update module mutation
    const updateModuleMutation = useMutation({
        mutationFn: async ({ moduleId, title }: { moduleId: number; title: string }) => {
            const { data } = await apiClient.put(`/modules/${moduleId}`, { title });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            setEditingModuleId(null);
            setEditingModuleTitle('');
            showSuccessAlert('Cập nhật chương thành công!', 'Tiêu đề chương học đã được thay đổi.');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi cập nhật chương', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    const handleSaveModuleTitle = (moduleId: number) => {
        if (editingModuleTitle.trim()) {
            updateModuleMutation.mutate({ moduleId, title: editingModuleTitle.trim() });
        }
    };

    // Delete module mutation
    const deleteModuleMutation = useMutation({
        mutationFn: async (moduleId: number) => {
            await apiClient.delete(`/modules/${moduleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            showSuccessAlert('Xóa thành công!', 'Chương học đã được xóa.');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi xóa chương', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    // Delete content mutation
    const deleteContentMutation = useMutation({
        mutationFn: async (contentId: number) => {
            await apiClient.delete(`/content/${contentId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            showSuccessAlert('Xóa thành công!', 'Nội dung đã được xóa.');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi xóa nội dung', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    const togglePreviewMutation = useMutation({
        mutationFn: async ({ contentId, isFreePreview }: { contentId: number; isFreePreview: boolean }) => {
            await apiClient.patch(`/content/${contentId}/preview`, { isFreePreview });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            showSuccessAlert('Đã cập nhật!', 'Thiết lập bài học xem thử đã được lưu.');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi cập nhật preview', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    // Submit for review mutation
    const submitForReviewMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(`/courses/${id}/submit`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
            showSuccessAlert(
                'Đã gửi duyệt!',
                'Khoá học đã được gửi tới quản trị viên để duyệt.',
            );
        },
        onError: (error: any) => {
            showErrorAlert(
                'Lỗi gửi duyệt',
                error.response?.data?.error || 'Đã có lỗi xảy ra',
            );
        },
    });

    const handleSubmitForReview = async () => {
        const result = await Swal.fire({
            title: 'Gửi khoá học để duyệt?',
            text: 'Sau khi gửi, bạn sẽ không thể chỉnh sửa cho đến khi có kết quả duyệt.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Gửi duyệt',
            cancelButtonText: 'Huỷ',
        });
        if (result.isConfirmed) {
            submitForReviewMutation.mutate();
        }
    };

    const toggleModule = (moduleId: number) => {
        setExpandedModules(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId);
            } else {
                newSet.add(moduleId);
            }
            return newSet;
        });
    };

    const handleDeleteModule = async (moduleId: number, moduleTitle: string) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa chương?',
            html: `Bạn có chắc muốn xóa chương <strong>"${moduleTitle}"</strong>?<br><br>
                   <span style="color: #dc2626;">Tất cả nội dung bên trong sẽ bị xóa!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteModuleMutation.mutate(moduleId);
        }
    };

    const handleDeleteContent = async (contentId: number, contentTitle: string) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa nội dung?',
            html: `Bạn có chắc muốn xóa <strong>"${contentTitle}"</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteContentMutation.mutate(contentId);
        }
    };

    const handleAddModule = () => {
        if (newModuleTitle.trim()) {
            createModuleMutation.mutate(newModuleTitle.trim());
        }
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'VIDEO':
                return <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
            case 'DOCUMENT':
                return <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />;
            case 'QUIZ':
                return <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
            case 'PRACTICE':
            case 'ASSIGNMENT':
                return <ClipboardList className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
            default:
                return null;
        }
    };

    const getContentTypeLabel = (type: string) => {
        switch (type) {
            case 'VIDEO':
                return 'Video';
            case 'DOCUMENT':
                return 'Tài liệu';
            case 'QUIZ':
                return 'Bài kiểm tra';
            case 'PRACTICE':
                return 'Bài thực hành';
            case 'ASSIGNMENT':
                return 'Bài tập';
            default:
                return type;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-zinc-900 dark:text-white mb-4">Không tìm thấy khóa học</p>
                    <Button onClick={() => navigate('/dashboard')}>Quay lại Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(dashboardPath)}
                        className="mb-3 sm:mb-4 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại {isAdmin ? 'Admin' : 'Dashboard'}
                    </Button>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                                Quản lý khóa học
                            </h1>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 break-words">
                                    {course.title}
                                </p>
                                {course.status && (
                                    <span
                                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[course.status]}`}
                                    >
                                        {STATUS_LABELS[course.status]}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {!isAdmin &&
                                (course.status === 'DRAFT' || course.status === 'REJECTED') && (
                                    <Button
                                        onClick={handleSubmitForReview}
                                        disabled={submitForReviewMutation.isPending}
                                        className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {submitForReviewMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        Gửi duyệt
                                    </Button>
                                )}
                            <Button
                                onClick={() => navigate(isAdmin ? `/admin/courses/${id}/syllabus` : `/teacher/courses/${id}/syllabus`)}
                                variant="outline"
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Cấu trúc AI
                            </Button>
                            <Button
                                onClick={() => navigate(studentsPath)}
                                variant="outline"
                                className="gap-2"
                            >
                                <UserCheck className="h-4 w-4" />
                                Xem học viên
                            </Button>
                            {!isAdmin && (
                                <Button
                                    onClick={() => navigate(`/courses/${id}/projects`)}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <Github className="h-4 w-4" />
                                    Dự án
                                </Button>
                            )}
                            <Button
                                onClick={() => navigate(editPath)}
                                variant="outline"
                                className="gap-2"
                            >
                                <Edit className="h-4 w-4" />
                                Sửa thông tin
                            </Button>
                        </div>
                    </div>

                    <Card className="mt-4 border-blue-200 bg-blue-50 p-3 sm:p-4 text-xs sm:text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3 min-w-0">
                                <Clock className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-300 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-semibold">Thiết lập thời hạn truy cập</p>
                                    <p className="mt-1">
                                        {course.accessDurationDays
                                            ? `Sau khi mua, học viên được truy cập khóa học trong ${course.accessDurationDays} ngày.`
                                            : 'Khóa học hiện đang để trống thời hạn, học viên được truy cập không giới hạn sau khi mua.'}
                                    </p>
                                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                                        Người set phần này là teacher/admin tại mục "Sửa thông tin" của khóa học.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => navigate(editPath)}
                                variant="outline"
                                className="shrink-0 border-blue-300 bg-white/70 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 w-full md:w-auto"
                            >
                                Cài thời hạn
                            </Button>
                        </div>
                    </Card>

                    {course.status === 'REJECTED' && course.rejectionReason && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                            <p className="font-semibold mb-1">Khoá học bị từ chối</p>
                            <p>
                                <strong>Lý do:</strong> {course.rejectionReason}
                            </p>
                            <p className="mt-2 text-xs">
                                Vui lòng chỉnh sửa khoá học theo phản hồi và nhấn "Gửi duyệt" lại.
                            </p>
                        </div>
                    )}

                    {course.status === 'PENDING_REVIEW' && (
                        <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/40 dark:text-yellow-300">
                            Khoá học đang chờ quản trị viên duyệt. Bạn sẽ nhận được thông báo khi có kết quả.
                        </div>
                    )}
                </div>

                {/* Modules List */}
                <div className="space-y-4">
                    {/* Add Module Button */}
                    {!isAddingModule ? (
                        <Card className="p-4 border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                            <Button
                                onClick={() => setIsAddingModule(true)}
                                variant="ghost"
                                className="w-full gap-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                                <Plus className="h-5 w-5" />
                                Thêm chương mới
                            </Button>
                        </Card>
                    ) : (
                        <Card className="p-3 sm:p-4 border-2 border-red-500">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Tên chương (VD: Chương 1: Giới thiệu)"
                                    value={newModuleTitle}
                                    onChange={(e) => setNewModuleTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddModule();
                                        if (e.key === 'Escape') {
                                            setIsAddingModule(false);
                                            setNewModuleTitle('');
                                        }
                                    }}
                                    autoFocus
                                    className="flex-1"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleAddModule}
                                        disabled={!newModuleTitle.trim() || createModuleMutation.isPending}
                                        className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                                    >
                                        {createModuleMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setIsAddingModule(false);
                                            setNewModuleTitle('');
                                        }}
                                        variant="outline"
                                        className="flex-1 sm:flex-none"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Modules */}
                    {course.modules.length === 0 ? (
                        <Card className="p-12 text-center border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-500 dark:text-zinc-400">
                                Chưa có chương nào. Hãy thêm chương đầu tiên!
                            </p>
                        </Card>
                    ) : (
                        course.modules.map((module) => (
                            <Card key={module.id} className="overflow-hidden border-zinc-200 dark:border-zinc-800">
                                {/* Module Header */}
                                <div className="p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between gap-2">
                                    {editingModuleId === module.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                value={editingModuleTitle}
                                                onChange={(e) => setEditingModuleTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveModuleTitle(module.id);
                                                    if (e.key === 'Escape') {
                                                        setEditingModuleId(null);
                                                        setEditingModuleTitle('');
                                                    }
                                                }}
                                                autoFocus
                                                className="h-8 max-w-md"
                                            />
                                            <Button
                                                size="sm"
                                                className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleSaveModuleTitle(module.id)}
                                                disabled={updateModuleMutation.isPending || !editingModuleTitle.trim()}
                                            >
                                                {updateModuleMutation.isPending ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Save className="h-3 w-3" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8"
                                                onClick={() => {
                                                    setEditingModuleId(null);
                                                    setEditingModuleTitle('');
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleModule(module.id)}
                                                className="p-0 h-8 w-8 shrink-0"
                                            >
                                                {expandedModules.has(module.id) ? (
                                                    <ChevronDown className="h-5 w-5" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5" />
                                                )}
                                            </Button>
                                            <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white break-words min-w-0">
                                                {module.title}
                                            </h3>
                                            <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                                                ({module.contents.length} bài)
                                            </span>
                                        </div>
                                    )}
                                    {editingModuleId !== module.id && (
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
                                                onClick={() => {
                                                    setEditingModuleId(module.id);
                                                    setEditingModuleTitle(module.title);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400"
                                                onClick={() => handleDeleteModule(module.id, module.title)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Module Contents */}
                                {expandedModules.has(module.id) && (
                                    <div className="p-3 sm:p-4 space-y-2">
                                        {/* Add Content Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2 border-dashed"
                                            onClick={() => setAddingContentToModule(module.id)}
                                        >
                                            <Plus className="h-4 w-4" />
                                            Thêm nội dung
                                        </Button>

                                        {/* Contents List */}
                                        {module.contents.length === 0 ? (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                                                Chưa có nội dung nào
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {module.contents.map((content) => (
                                                    <div
                                                        key={content.id}
                                                        className="flex flex-col gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 sm:flex-row sm:items-center"
                                                    >
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <div className="shrink-0">{getContentIcon(content.contentType)}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-zinc-900 dark:text-white text-sm break-words">
                                                                    {content.title}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    {getContentTypeLabel(content.contentType)}
                                                                    {content.durationInSeconds && (
                                                                        <> • {Math.floor(content.durationInSeconds / 60)} phút</>
                                                                    )}
                                                                    {content.isFreePreview && (
                                                                        <> • Xem thử miễn phí</>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                                            <Button
                                                                variant={content.isFreePreview ? 'default' : 'outline'}
                                                                size="sm"
                                                                className="gap-1 text-xs"
                                                                disabled={togglePreviewMutation.isPending}
                                                                onClick={() => togglePreviewMutation.mutate({
                                                                    contentId: content.id,
                                                                    isFreePreview: !content.isFreePreview,
                                                                })}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                {content.isFreePreview ? 'Đang preview' : 'Mở preview'}
                                                            </Button>
                                                            {content.contentType === 'QUIZ' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:text-blue-400 text-xs"
                                                                    onClick={() => navigate(quizManagePath(content.id))}
                                                                >
                                                                    <Edit className="h-4 w-4 mr-1" />
                                                                    Quản lý câu hỏi
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-300 text-xs"
                                                                onClick={() => setEditingContent({ ...content, moduleId: module.id })}
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" />
                                                                Sửa
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400"
                                                                onClick={() => handleDeleteContent(content.id, content.title)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>

                {/* Add Content Modal */}
                {addingContentToModule && (
                    <AddContentModal
                        moduleId={addingContentToModule}
                        courseId={id!}
                        onClose={() => setAddingContentToModule(null)}
                    />
                )}

                {/* Edit Content Modal */}
                {editingContent && (
                    <AddContentModal
                        moduleId={editingContent.moduleId!}
                        courseId={id!}
                        initialData={editingContent}
                        onClose={() => setEditingContent(null)}
                    />
                )}
            </div>
        </div>
    );
}


