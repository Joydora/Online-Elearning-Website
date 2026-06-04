import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

type ContentType = 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE' | 'ASSIGNMENT';

type Props = {
    moduleId: number;
    courseId: string;
    onClose: () => void;
};

export function AddContentModal({ moduleId, courseId, onClose }: Props) {
    const queryClient = useQueryClient();
    const [contentType, setContentType] = useState<ContentType>('VIDEO');
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [durationInSeconds, setDurationInSeconds] = useState('');
    const [documentUrl, setDocumentUrl] = useState('');
    const [fileType, setFileType] = useState('application/pdf');
    const [timeLimitInMinutes, setTimeLimitInMinutes] = useState('');
    const [practicePrompt, setPracticePrompt] = useState('');
    const [starterCode, setStarterCode] = useState('');
    const [expectedOutput, setExpectedOutput] = useState('');
    const [rubric, setRubric] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [isFreePreview, setIsFreePreview] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const createContentMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: response } = await apiClient.post('/content', data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', courseId] });
            showSuccessAlert('Thêm nội dung thành công!', 'Nội dung mới đã được tạo.');
            onClose();
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi tạo nội dung', error.response?.data?.error || 'Đã có lỗi xảy ra');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            showErrorAlert('Lỗi', 'Vui lòng nhập tiêu đề');
            return;
        }

        const baseData = {
            moduleId,
            title: title.trim(),
            contentType,
            isFreePreview,
        };

        let data: any = { ...baseData };

        if (contentType === 'VIDEO') {
            if (!videoUrl.trim()) {
                showErrorAlert('Lỗi', 'Vui lòng nhập URL video');
                return;
            }
            data.videoUrl = videoUrl.trim();
            if (durationInSeconds) {
                data.durationInSeconds = parseInt(durationInSeconds);
            }
        } else if (contentType === 'DOCUMENT') {
            if (!documentUrl.trim()) {
                showErrorAlert('Lỗi', 'Vui lòng nhập URL tài liệu');
                return;
            }
            data.documentUrl = documentUrl.trim();
            data.fileType = fileType;
        } else if (contentType === 'QUIZ') {
            if (timeLimitInMinutes) {
                data.timeLimitInMinutes = parseInt(timeLimitInMinutes);
            }
        } else if (contentType === 'PRACTICE' || contentType === 'ASSIGNMENT') {
            if (!practicePrompt.trim()) {
                showErrorAlert('Lỗi', 'Vui lòng nhập yêu cầu bài thực hành/bài tập');
                return;
            }
            data.practicePrompt = practicePrompt.trim();
            data.starterCode = starterCode || undefined;
            data.expectedOutput = expectedOutput || undefined;
            data.rubric = rubric || undefined;
            data.language = language || 'javascript';
        }

        createContentMutation.mutate(data);
    };

    const handleFileUpload = async (file: File, type: 'video' | 'document') => {
        setIsUploading(true);
        setUploadProgress('Đang upload...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const uploadedUrl = response.data.secure_url;

            if (type === 'video') {
                setVideoUrl(uploadedUrl);
                setUploadProgress('Upload video thành công!');
            } else {
                setDocumentUrl(uploadedUrl);
                setUploadProgress('Upload tài liệu thành công!');
            }

            setTimeout(() => setUploadProgress(''), 3000);
        } catch (error: any) {
            showErrorAlert('Lỗi upload', error.response?.data?.error || 'Không thể upload file');
            setUploadProgress('');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                        Thêm nội dung mới
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-2 shrink-0"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                    {/* Content Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Loại nội dung <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value as ContentType)}
                            className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
                        >
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Tài liệu</option>
                            <option value="QUIZ">Bài kiểm tra</option>
                            <option value="PRACTICE">Bài thực hành</option>
                            <option value="ASSIGNMENT">Bài tập</option>
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Tiêu đề <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: Bài 1: Giới thiệu về TypeScript"
                            className="h-12"
                        />
                    </div>

                    {/* Conditional Fields */}
                    <label className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900/50 dark:bg-green-950/30">
                        <input
                            type="checkbox"
                            checked={isFreePreview}
                            onChange={(e) => setIsFreePreview(e.target.checked)}
                            className="mt-1"
                        />
                        <span>
                            <span className="block font-medium text-green-800 dark:text-green-300">
                                Cho phép xem miễn phí
                            </span>
                            <span className="text-green-700 dark:text-green-400">
                                Học viên chưa mua/chưa học thử vẫn có thể mở bài này trên trang chi tiết khóa học.
                            </span>
                        </span>
                    </label>

                    {/* Conditional Fields */}
                    {contentType === 'VIDEO' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Video <span className="text-red-500">*</span>
                                </label>

                                {/* File Upload Button */}
                                <div className="mb-3">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(file, 'video');
                                        }}
                                        className="hidden"
                                        id="video-upload"
                                        disabled={isUploading || createContentMutation.isPending}
                                    />
                                    <label
                                        htmlFor="video-upload"
                                        className={`inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors ${isUploading || createContentMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Upload video từ máy
                                            </>
                                        )}
                                    </label>
                                    {uploadProgress && (
                                        <span className="ml-3 text-sm text-green-600 dark:text-green-400">
                                            {uploadProgress}
                                        </span>
                                    )}
                                </div>

                                {/* OR Divider */}
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">hoặc nhập URL</span>
                                    </div>
                                </div>

                                {/* URL Input */}
                                <Input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://example.com/video.mp4"
                                    className="h-12"
                                    type="url"
                                    disabled={isUploading}
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Link video từ YouTube, Vimeo, hoặc URL trực tiếp
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Thời lượng (giây)
                                </label>
                                <Input
                                    value={durationInSeconds}
                                    onChange={(e) => setDurationInSeconds(e.target.value)}
                                    placeholder="900"
                                    className="h-12"
                                    type="number"
                                    min="0"
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    VD: 900 giây = 15 phút
                                </p>
                            </div>
                        </>
                    )}

                    {contentType === 'DOCUMENT' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Tài liệu <span className="text-red-500">*</span>
                                </label>

                                {/* File Upload Button */}
                                <div className="mb-3">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleFileUpload(file, 'document');
                                                // Auto-detect file type
                                                if (file.type) {
                                                    setFileType(file.type);
                                                }
                                            }
                                        }}
                                        className="hidden"
                                        id="document-upload"
                                        disabled={isUploading || createContentMutation.isPending}
                                    />
                                    <label
                                        htmlFor="document-upload"
                                        className={`inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors ${isUploading || createContentMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Đang upload...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Upload tài liệu từ máy
                                            </>
                                        )}
                                    </label>
                                    {uploadProgress && (
                                        <span className="ml-3 text-sm text-green-600 dark:text-green-400">
                                            {uploadProgress}
                                        </span>
                                    )}
                                </div>

                                {/* OR Divider */}
                                <div className="relative mb-3">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">hoặc nhập URL</span>
                                    </div>
                                </div>

                                {/* URL Input */}
                                <Input
                                    value={documentUrl}
                                    onChange={(e) => setDocumentUrl(e.target.value)}
                                    placeholder="https://example.com/document.pdf"
                                    className="h-12"
                                    type="url"
                                    disabled={isUploading}
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Link tài liệu PDF, DOCX, PPT từ Google Drive hoặc URL trực tiếp
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Loại file
                                </label>
                                <select
                                    value={fileType}
                                    onChange={(e) => setFileType(e.target.value)}
                                    className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
                                >
                                    <option value="application/pdf">PDF</option>
                                    <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (DOCX)</option>
                                    <option value="application/vnd.openxmlformats-officedocument.presentationml.presentation">PowerPoint (PPTX)</option>
                                    <option value="text/plain">Text</option>
                                </select>
                            </div>
                        </>
                    )}

                    {contentType === 'QUIZ' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Giới hạn thời gian (phút)
                                </label>
                                <Input
                                    value={timeLimitInMinutes}
                                    onChange={(e) => setTimeLimitInMinutes(e.target.value)}
                                    placeholder="10"
                                    className="h-12"
                                    type="number"
                                    min="1"
                                />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Để trống nếu không giới hạn thời gian
                                </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Lưu ý:</strong> Sau khi tạo bài kiểm tra, bạn cần vào quản lý để thêm câu hỏi và đáp án.
                                </p>
                            </div>
                        </>
                    )}

                    {(contentType === 'PRACTICE' || contentType === 'ASSIGNMENT') && (
                        <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-950/30">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Yêu cầu bài {contentType === 'PRACTICE' ? 'thực hành' : 'tập'} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={practicePrompt}
                                    onChange={(e) => setPracticePrompt(e.target.value)}
                                    placeholder="Mô tả yêu cầu, input/output, ràng buộc..."
                                    rows={4}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Starter code
                                </label>
                                <textarea
                                    value={starterCode}
                                    onChange={(e) => setStarterCode(e.target.value)}
                                    placeholder="function solve() { ... }"
                                    rows={5}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Ngôn ngữ
                                    </label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500"
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Expected output
                                    </label>
                                    <Input
                                        value={expectedOutput}
                                        onChange={(e) => setExpectedOutput(e.target.value)}
                                        placeholder="Kết quả mong đợi"
                                        className="h-12"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Rubric chấm điểm
                                </label>
                                <textarea
                                    value={rubric}
                                    onChange={(e) => setRubric(e.target.value)}
                                    placeholder="Tiêu chí đúng/sai, hiệu năng, style code..."
                                    rows={3}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={createContentMutation.isPending || isUploading}
                            className="flex-1 h-12"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={createContentMutation.isPending || isUploading}
                            className="flex-1 h-12 bg-red-600 hover:bg-red-700"
                        >
                            {createContentMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    Tạo nội dung
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


