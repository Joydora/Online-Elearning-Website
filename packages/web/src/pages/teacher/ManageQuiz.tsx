import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Loader2,
    Save,
    X,
    CheckCircle,
    Circle,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';

type Option = {
    id: number;
    optionText: string;
    isCorrect: boolean;
};

type Question = {
    id: number;
    questionText: string;
    options: Option[];
};

type VideoContentForMarker = {
    id: number;
    title: string;
    videoUrl: string | null;
    durationInSeconds: number | null;
    module: {
        id: number;
        title: string;
    };
};

type VideoQuizMarker = {
    id: number;
    contentId: number;
    timestampSec: number;
    blockingMode: 'pause' | 'non-blocking';
    questionId: number;
    content: {
        id: number;
        title: string;
    };
};

type QuizDetail = {
    id: number;
    title: string;
    timeLimitInMinutes: number | null;
    questions: Question[];
    availableVideoContents: VideoContentForMarker[];
    markers: VideoQuizMarker[];
};

export default function ManageQuiz() {
    const { contentId } = useParams<{ contentId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const markerVideoRef = useRef<HTMLVideoElement | null>(null);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [addingOptionsFor, setAddingOptionsFor] = useState<number | null>(null);
    const [newOptionText, setNewOptionText] = useState('');
    const [newOptionIsCorrect, setNewOptionIsCorrect] = useState(false);
    const [selectedVideoContentId, setSelectedVideoContentId] = useState<number | null>(null);
    const [markerTimestampSec, setMarkerTimestampSec] = useState(0);
    const [markerQuestionId, setMarkerQuestionId] = useState<number | null>(null);
    const [markerBlockingMode, setMarkerBlockingMode] = useState<'pause' | 'non-blocking'>('pause');

    // Fetch quiz with questions
    const { data: quiz, isLoading } = useQuery<QuizDetail>({
        queryKey: ['quiz-manage', contentId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/quiz/${contentId}/manage`);
            return data;
        },
        enabled: !!contentId,
    });

    useEffect(() => {
        if (!quiz) return;

        if (!selectedVideoContentId && quiz.availableVideoContents.length > 0) {
            setSelectedVideoContentId(quiz.availableVideoContents[0].id);
        }

        if (!markerQuestionId && quiz.questions.length > 0) {
            setMarkerQuestionId(quiz.questions[0].id);
        }
    }, [quiz, selectedVideoContentId, markerQuestionId]);

    // Create question mutation
    const createQuestionMutation = useMutation({
        mutationFn: async (questionText: string) => {
            const { data } = await apiClient.post('/questions', {
                contentId: parseInt(contentId!),
                questionText,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            setIsAddingQuestion(false);
            setNewQuestionText('');
            showSuccessAlert('Thêm câu hỏi thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể tạo câu hỏi');
        },
    });

    // Delete question mutation
    const deleteQuestionMutation = useMutation({
        mutationFn: async (questionId: number) => {
            await apiClient.delete(`/questions/${questionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Xóa câu hỏi thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể xóa câu hỏi');
        },
    });

    // Create option mutation
    const createOptionMutation = useMutation({
        mutationFn: async ({
            questionId,
            optionText,
            isCorrect,
        }: {
            questionId: number;
            optionText: string;
            isCorrect: boolean;
        }) => {
            const { data } = await apiClient.post('/options', {
                questionId,
                optionText,
                isCorrect,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            setNewOptionText('');
            setNewOptionIsCorrect(false);
            showSuccessAlert('Thêm đáp án thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể tạo đáp án');
        },
    });

    // Delete option mutation
    const deleteOptionMutation = useMutation({
        mutationFn: async (optionId: number) => {
            await apiClient.delete(`/options/${optionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Xóa đáp án thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể xóa đáp án');
        },
    });

    const createMarkerMutation = useMutation({
        mutationFn: async () => {
            if (!selectedVideoContentId || !markerQuestionId) {
                throw new Error('Missing marker data');
            }

            const { data } = await apiClient.post('/markers', {
                contentId: selectedVideoContentId,
                timestampSec: markerTimestampSec,
                questionId: markerQuestionId,
                blockingMode: markerBlockingMode,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Thêm marker thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể tạo marker');
        },
    });

    const deleteMarkerMutation = useMutation({
        mutationFn: async (markerId: number) => {
            await apiClient.delete(`/markers/${markerId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Xóa marker thành công!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Lỗi', error.response?.data?.error || 'Không thể xóa marker');
        },
    });

    const handleDeleteQuestion = async (questionId: number, questionText: string) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa câu hỏi?',
            html: `Bạn có chắc muốn xóa câu hỏi <strong>"${questionText}"</strong>?<br><br>
                   <span style="color: #dc2626;">Tất cả đáp án sẽ bị xóa!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteQuestionMutation.mutate(questionId);
        }
    };

    const handleDeleteOption = async (optionId: number) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa đáp án?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteOptionMutation.mutate(optionId);
        }
    };

    const handleAddQuestion = () => {
        if (newQuestionText.trim()) {
            createQuestionMutation.mutate(newQuestionText.trim());
        }
    };

    const handleAddOption = (questionId: number) => {
        if (newOptionText.trim()) {
            createOptionMutation.mutate({
                questionId,
                optionText: newOptionText.trim(),
                isCorrect: newOptionIsCorrect,
            });
        }
    };

    const selectedVideo = quiz?.availableVideoContents.find((video) => video.id === selectedVideoContentId);
    const selectedVideoMarkers = quiz?.markers.filter((marker) => marker.contentId === selectedVideoContentId) ?? [];

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleUseCurrentVideoTime = () => {
        if (!markerVideoRef.current) return;
        setMarkerTimestampSec(Math.floor(markerVideoRef.current.currentTime));
    };

    const handleCreateMarker = () => {
        if (!selectedVideoContentId) {
            showErrorAlert('Vui lòng chọn video');
            return;
        }

        if (!markerQuestionId) {
            showErrorAlert('Vui lòng chọn câu hỏi');
            return;
        }

        createMarkerMutation.mutate();
    };

    const handleDeleteMarker = async (markerId: number) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa marker?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });

        if (result.isConfirmed) {
            deleteMarkerMutation.mutate(markerId);
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

    if (!quiz) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-zinc-900 dark:text-white mb-4">
                        Không tìm thấy bài kiểm tra
                    </p>
                    <Button onClick={() => navigate(-1)}>Quay lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-4 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại
                    </Button>

                    <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Quản lý bài kiểm tra
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">{quiz.title}</p>
                    {quiz.timeLimitInMinutes && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                            Thời gian: {quiz.timeLimitInMinutes} phút
                        </p>
                    )}
                </div>

                {/* Video Quiz Markers */}
                <Card className="p-6 mb-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                Quiz nhúng trong video
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Chọn video, lấy timestamp trên timeline và gắn câu hỏi của quiz này vào video.
                            </p>
                        </div>
                    </div>

                    {quiz.availableVideoContents.length === 0 ? (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                            Khóa học này chưa có video để gắn marker.
                        </div>
                    ) : quiz.questions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                            Hãy tạo ít nhất một câu hỏi trước khi thêm marker.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Video
                                    </label>
                                    <select
                                        value={selectedVideoContentId ?? ''}
                                        onChange={(e) => setSelectedVideoContentId(Number(e.target.value))}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        {quiz.availableVideoContents.map((video) => (
                                            <option key={video.id} value={video.id}>
                                                {video.module.title} - {video.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Câu hỏi
                                    </label>
                                    <select
                                        value={markerQuestionId ?? ''}
                                        onChange={(e) => setMarkerQuestionId(Number(e.target.value))}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        {quiz.questions.map((question, index) => (
                                            <option key={question.id} value={question.id}>
                                                Câu {index + 1}: {question.questionText}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedVideo?.videoUrl && (
                                <video
                                    ref={markerVideoRef}
                                    controls
                                    src={selectedVideo.videoUrl}
                                    className="w-full rounded-lg bg-black max-h-[360px]"
                                >
                                    Trình duyệt của bạn không hỗ trợ video.
                                </video>
                            )}

                            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Timestamp (giây)
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={selectedVideo?.durationInSeconds ?? undefined}
                                        value={markerTimestampSec}
                                        onChange={(e) => setMarkerTimestampSec(Number(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Chế độ
                                    </label>
                                    <select
                                        value={markerBlockingMode}
                                        onChange={(e) => setMarkerBlockingMode(e.target.value as 'pause' | 'non-blocking')}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        <option value="pause">Pause video</option>
                                        <option value="non-blocking">Không chặn video</option>
                                    </select>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleUseCurrentVideoTime}
                                    disabled={!selectedVideo?.videoUrl}
                                >
                                    Lấy thời điểm hiện tại
                                </Button>
                            </div>

                            <Button
                                onClick={handleCreateMarker}
                                disabled={createMarkerMutation.isPending}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {createMarkerMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Đang thêm...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Thêm marker
                                    </>
                                )}
                            </Button>

                            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-3">
                                    Marker trên video đã chọn
                                </h3>
                                {selectedVideoMarkers.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Chưa có marker nào trên video này.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedVideoMarkers.map((marker) => {
                                            const questionIndex = quiz.questions.findIndex((question) => question.id === marker.questionId);
                                            return (
                                                <div
                                                    key={marker.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                                                >
                                                    <span className="font-mono text-sm text-red-600 dark:text-red-400">
                                                        {formatTime(marker.timestampSec)}
                                                    </span>
                                                    <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                                                        Câu {questionIndex >= 0 ? questionIndex + 1 : '?'}: {quiz.questions[questionIndex]?.questionText ?? 'Câu hỏi đã xóa'}
                                                    </span>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                                        {marker.blockingMode === 'pause' ? 'Pause' : 'Non-blocking'}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                        onClick={() => handleDeleteMarker(marker.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Questions List */}
                <div className="space-y-6">
                    {/* Add Question Button */}
                    {!isAddingQuestion ? (
                        <Card className="p-4 border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                            <Button
                                onClick={() => setIsAddingQuestion(true)}
                                variant="ghost"
                                className="w-full gap-2 text-zinc-600 dark:text-zinc-400"
                            >
                                <Plus className="h-5 w-5" />
                                Thêm câu hỏi mới
                            </Button>
                        </Card>
                    ) : (
                        <Card className="p-4 border-2 border-red-500">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nhập câu hỏi..."
                                    value={newQuestionText}
                                    onChange={(e) => setNewQuestionText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddQuestion();
                                        if (e.key === 'Escape') {
                                            setIsAddingQuestion(false);
                                            setNewQuestionText('');
                                        }
                                    }}
                                    autoFocus
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleAddQuestion}
                                    disabled={
                                        !newQuestionText.trim() ||
                                        createQuestionMutation.isPending
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {createQuestionMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsAddingQuestion(false);
                                        setNewQuestionText('');
                                    }}
                                    variant="outline"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Questions */}
                    {quiz.questions.length === 0 ? (
                        <Card className="p-12 text-center">
                            <p className="text-zinc-500 dark:text-zinc-400">
                                Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!
                            </p>
                        </Card>
                    ) : (
                        quiz.questions.map((question, index) => (
                            <Card key={question.id} className="p-6">
                                {/* Question Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                                            Câu {index + 1}: {question.questionText}
                                        </h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {question.options.length} đáp án
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                        onClick={() =>
                                            handleDeleteQuestion(question.id, question.questionText)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Options */}
                                <div className="space-y-2 mb-4">
                                    {question.options.map((option) => (
                                        <div
                                            key={option.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border ${option.isCorrect
                                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                }`}
                                        >
                                            {option.isCorrect ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                                            )}
                                            <p className="flex-1 text-zinc-900 dark:text-white">
                                                {option.optionText}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                onClick={() => handleDeleteOption(option.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Option Form */}
                                {addingOptionsFor === question.id ? (
                                    <div className="border-t pt-4 space-y-3">
                                        <Input
                                            placeholder="Nhập đáp án..."
                                            value={newOptionText}
                                            onChange={(e) => setNewOptionText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddOption(question.id);
                                                if (e.key === 'Escape') {
                                                    setAddingOptionsFor(null);
                                                    setNewOptionText('');
                                                    setNewOptionIsCorrect(false);
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`correct-${question.id}`}
                                                checked={newOptionIsCorrect}
                                                onChange={(e) => setNewOptionIsCorrect(e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                                            />
                                            <label
                                                htmlFor={`correct-${question.id}`}
                                                className="text-sm text-zinc-700 dark:text-zinc-300"
                                            >
                                                Đáp án đúng
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleAddOption(question.id)}
                                                disabled={
                                                    !newOptionText.trim() ||
                                                    createOptionMutation.isPending
                                                }
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            >
                                                {createOptionMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Đang thêm...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Thêm đáp án
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setAddingOptionsFor(null);
                                                    setNewOptionText('');
                                                    setNewOptionIsCorrect(false);
                                                }}
                                                variant="outline"
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => setAddingOptionsFor(question.id)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Thêm đáp án
                                    </Button>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}


