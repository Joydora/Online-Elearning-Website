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
    X
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
    contentType: 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';
    videoUrl?: string;
    durationInSeconds?: number;
    documentUrl?: string;
    fileType?: string;
    timeLimitInMinutes?: number;
    isFreePreview?: boolean;
};

type Module = {
    id: number;
    title: string;
    order: number;
    contents: Content[];
};

type CourseDetail = {
    id: number;
    title: string;
    description: string;
    price: number;
    modules: Module[];
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
    const quizManagePath = (contentId: number) => isAdmin ? `/admin/quiz/${contentId}/manage` : `/quiz/${contentId}/manage`;
    
    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [addingContentToModule, setAddingContentToModule] = useState<number | null>(null);

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

    // Toggle free-preview mutation
    const togglePreviewMutation = useMutation({
        mutationFn: async ({ contentId, isFreePreview }: { contentId: number; isFreePreview: boolean }) => {
            const { data } = await apiClient.put(`/content/${contentId}`, { isFreePreview });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', id] });
        },
        onError: (error: any) => {
            showErrorAlert('Không thể cập nhật', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

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
            default:
                return type;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-900 dark:text-white mb-4">Không tìm thấy khóa học</p>
                    <Button onClick={() => navigate('/dashboard')}>Quay lại Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(dashboardPath)}
                        className="mb-4 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại {isAdmin ? 'Admin' : 'Dashboard'}
                    </Button>

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                Quản lý khóa học
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400">
                                {course.title}
                            </p>
                        </div>
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

                {/* Modules List */}
                <div className="space-y-4">
                    {/* Add Module Button */}
                    {!isAddingModule ? (
                        <Card className="p-4 border-dashed border-2 border-gray-300 dark:border-gray-700">
                            <Button
                                onClick={() => setIsAddingModule(true)}
                                variant="ghost"
                                className="w-full gap-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                                <Plus className="h-5 w-5" />
                                Thêm chương mới
                            </Button>
                        </Card>
                    ) : (
                        <Card className="p-4 border-2 border-red-500">
                            <div className="flex gap-2">
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
                                <Button
                                    onClick={handleAddModule}
                                    disabled={!newModuleTitle.trim() || createModuleMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700"
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
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Modules */}
                    {course.modules.length === 0 ? (
                        <Card className="p-12 text-center border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-gray-400">
                                Chưa có chương nào. Hãy thêm chương đầu tiên!
                            </p>
                        </Card>
                    ) : (
                        course.modules.map((module) => (
                            <Card key={module.id} className="overflow-hidden border-gray-200 dark:border-gray-800">
                                {/* Module Header */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleModule(module.id)}
                                            className="p-0 h-8 w-8"
                                        >
                                            {expandedModules.has(module.id) ? (
                                                <ChevronDown className="h-5 w-5" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5" />
                                            )}
                                        </Button>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {module.title}
                                        </h3>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            ({module.contents.length} bài)
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"
                                            onClick={() => handleDeleteModule(module.id, module.title)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Module Contents */}
                                {expandedModules.has(module.id) && (
                                    <div className="p-4 space-y-2">
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
                                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                                Chưa có nội dung nào
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {module.contents.map((content) => (
                                                    <div
                                                        key={content.id}
                                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                                    >
                                                        {getContentIcon(content.contentType)}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                                {content.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {getContentTypeLabel(content.contentType)}
                                                                {content.durationInSeconds && (
                                                                    <> • {Math.floor(content.durationInSeconds / 60)} phút</>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant={content.isFreePreview ? 'default' : 'outline'}
                                                            size="sm"
                                                            data-testid={`preview-toggle-${content.id}`}
                                                            className={
                                                                content.isFreePreview
                                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                                    : 'text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30'
                                                            }
                                                            disabled={togglePreviewMutation.isPending}
                                                            onClick={() =>
                                                                togglePreviewMutation.mutate({
                                                                    contentId: content.id,
                                                                    isFreePreview: !content.isFreePreview,
                                                                })
                                                            }
                                                        >
                                                            {content.isFreePreview ? 'Miễn phí ✓' : 'Đặt miễn phí'}
                                                        </Button>
                                                        {content.contentType === 'QUIZ' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:text-blue-400"
                                                                onClick={() => navigate(quizManagePath(content.id))}
                                                            >
                                                                <Edit className="h-4 w-4 mr-1" />
                                                                Quản lý câu hỏi
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"
                                                            onClick={() => handleDeleteContent(content.id, content.title)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
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
            </div>
        </div>
    );
}

