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
    initialData?: any;
};

export function AddContentModal({ moduleId, courseId, onClose, initialData }: Props) {
    const queryClient = useQueryClient();
    const [contentType, setContentType] = useState<ContentType>(initialData?.contentType || 'VIDEO');
    const [title, setTitle] = useState(initialData?.title || '');
    const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');
    const [durationInSeconds, setDurationInSeconds] = useState(initialData?.durationInSeconds ? String(initialData.durationInSeconds) : '');
    const [documentUrl, setDocumentUrl] = useState(initialData?.documentUrl || '');
    const [fileType, setFileType] = useState(initialData?.fileType || 'application/pdf');
    const [timeLimitInMinutes, setTimeLimitInMinutes] = useState(initialData?.timeLimitInMinutes ? String(initialData.timeLimitInMinutes) : '');
    const [practicePrompt, setPracticePrompt] = useState(initialData?.practice?.prompt || '');
    const [starterCode, setStarterCode] = useState(initialData?.practice?.starterCode || '');
    const [expectedOutput, setExpectedOutput] = useState(initialData?.practice?.expectedOutput || '');
    const [rubric, setRubric] = useState(initialData?.practice?.rubric || '');
    const [language, setLanguage] = useState(initialData?.practice?.language || 'javascript');
    const [isFreePreview, setIsFreePreview] = useState(initialData?.isFreePreview || false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const createContentMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: response } = await apiClient.post('/content', data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', courseId] });
            showSuccessAlert('Content added successfully!', 'The new content has been created.');
            onClose();
        },
        onError: (error: any) => {
            showErrorAlert('Error creating content', error.response?.data?.error || 'An error occurred');
        },
    });

    const updateContentMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: response } = await apiClient.put(`/content/${initialData.id}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-manage', courseId] });
            showSuccessAlert('Update successful!', 'The lesson content has been updated.');
            onClose();
        },
        onError: (error: any) => {
            showErrorAlert('Error updating lesson', error.response?.data?.error || 'An error occurred');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            showErrorAlert('Error', 'Please enter a title');
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
                showErrorAlert('Error', 'Please enter a video URL');
                return;
            }
            data.videoUrl = videoUrl.trim();
            if (durationInSeconds) {
                data.durationInSeconds = parseInt(durationInSeconds);
            }
        } else if (contentType === 'DOCUMENT') {
            if (!documentUrl.trim()) {
                showErrorAlert('Error', 'Please enter a document URL');
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
                showErrorAlert('Error', 'Please enter exercise/practice instructions');
                return;
            }
            data.practicePrompt = practicePrompt.trim();
            data.starterCode = starterCode || undefined;
            data.expectedOutput = expectedOutput || undefined;
            data.rubric = rubric || undefined;
            data.language = language || 'javascript';
        }

        if (initialData) {
            updateContentMutation.mutate(data);
        } else {
            createContentMutation.mutate(data);
        }
    };

    const handleFileUpload = async (file: File, type: 'video' | 'document') => {
        setIsUploading(true);
        setUploadProgress('Uploading...');

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
                setUploadProgress('Video uploaded successfully!');
            } else {
                setDocumentUrl(uploadedUrl);
                setUploadProgress('Document uploaded successfully!');
            }

            setTimeout(() => setUploadProgress(''), 3000);
        } catch (error: any) {
            showErrorAlert('Upload error', error.response?.data?.error || 'Could not upload file');
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
                        {initialData ? 'Edit Content' : 'Add New Content'}
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
                            Content Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value as ContentType)}
                            disabled={!!initialData}
                            className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <option value="VIDEO">Video</option>
                            <option value="DOCUMENT">Document</option>
                            <option value="QUIZ">Quiz</option>
                            <option value="PRACTICE">Practice</option>
                            <option value="ASSIGNMENT">Assignment</option>
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Lesson 1: Introduction to TypeScript"
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
                                Enable Free Preview
                            </span>
                            <span className="text-green-700 dark:text-green-400">
                                Students who have not purchased or started a trial can still access this lesson on the course details page.
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
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Upload video from device
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
                                        <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or enter URL</span>
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
                                    Video link from YouTube, Vimeo, or direct URL
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Duration (seconds)
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
                                    e.g. 900 seconds = 15 minutes
                                </p>
                            </div>
                        </>
                    )}

                    {contentType === 'DOCUMENT' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Document <span className="text-red-500">*</span>
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
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Upload document from device
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
                                        <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or enter URL</span>
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
                                    PDF, DOCX, PPT document link from Google Drive or direct URL
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    File Type
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
                                    Time Limit (minutes)
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
                                    Leave empty for no time limit
                                </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> After creating a quiz, you need to go to management to add questions and answers.
                                </p>
                            </div>
                        </>
                    )}

                    {(contentType === 'PRACTICE' || contentType === 'ASSIGNMENT') && (
                        <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900/50 dark:bg-purple-950/30">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    {contentType === 'PRACTICE' ? 'Practice' : 'Assignment'} Requirements <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={practicePrompt}
                                    onChange={(e) => setPracticePrompt(e.target.value)}
                                    placeholder="Description of requirements, inputs/outputs, constraints..."
                                    rows={4}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Starter Code
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
                                        Language
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
                                        Expected Output
                                    </label>
                                    <Input
                                        value={expectedOutput}
                                        onChange={(e) => setExpectedOutput(e.target.value)}
                                        placeholder="Expected result"
                                        className="h-12"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Grading Rubric
                                </label>
                                <textarea
                                    value={rubric}
                                    onChange={(e) => setRubric(e.target.value)}
                                    placeholder="Criteria for correct/incorrect, performance, code style..."
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
                            disabled={createContentMutation.isPending || updateContentMutation.isPending || isUploading}
                            className="flex-1 h-12"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createContentMutation.isPending || updateContentMutation.isPending || isUploading}
                            className="flex-1 h-12 bg-red-600 hover:bg-red-700"
                        >
                            {createContentMutation.isPending || updateContentMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {initialData ? 'Saving...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-5 w-5" />
                                    {initialData ? 'Save Changes' : 'Create Content'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


