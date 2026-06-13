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
    Sparkles,
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
    const [showAIForm, setShowAIForm] = useState(false);
    const [aiNumQuestions, setAiNumQuestions] = useState(5);
    const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [draftQuestions, setDraftQuestions] = useState<Array<{
        questionText: string;
        explanation?: string;
        options: Array<{ optionText: string; isCorrect: boolean }>;
    }> | null>(null);

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
            showSuccessAlert('Question added successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to create question');
        },
    });

    // Delete question mutation
    const deleteQuestionMutation = useMutation({
        mutationFn: async (questionId: number) => {
            await apiClient.delete(`/questions/${questionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Question deleted successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to delete question');
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
            showSuccessAlert('Option added successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to create option');
        },
    });

    // Delete option mutation
    const deleteOptionMutation = useMutation({
        mutationFn: async (optionId: number) => {
            await apiClient.delete(`/options/${optionId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Option deleted successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to delete option');
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
            showSuccessAlert('Marker added successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to create marker');
        },
    });

    const deleteMarkerMutation = useMutation({
        mutationFn: async (markerId: number) => {
            await apiClient.delete(`/markers/${markerId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            showSuccessAlert('Marker deleted successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to delete marker');
        },
    });

    const generateAIMutation = useMutation({
        mutationFn: async ({ numQuestions, difficulty }: { numQuestions: number; difficulty: string }) => {
            const { data } = await apiClient.post(`/quiz/${contentId}/generate-ai`, {
                numQuestions,
                difficulty,
            });
            return data;
        },
        onSuccess: (data) => {
            setDraftQuestions(data.questions);
            setShowAIForm(false);
            showSuccessAlert('AI draft questions generated!', 'Please review, edit, and click Save to add them.');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to generate quiz questions');
        },
    });

    const saveBatchQuestionsMutation = useMutation({
        mutationFn: async (questions: typeof draftQuestions) => {
            const { data } = await apiClient.post(`/quiz/${contentId}/questions/batch`, {
                questions,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-manage', contentId] });
            setDraftQuestions(null);
            showSuccessAlert('Questions saved successfully!', '');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to save questions');
        },
    });

    const handleDraftQuestionTextChange = (qIndex: number, text: string) => {
        if (!draftQuestions) return;
        const updated = [...draftQuestions];
        updated[qIndex].questionText = text;
        setDraftQuestions(updated);
    };

    const handleDraftOptionTextChange = (qIndex: number, oIndex: number, text: string) => {
        if (!draftQuestions) return;
        const updated = [...draftQuestions];
        updated[qIndex].options[oIndex].optionText = text;
        setDraftQuestions(updated);
    };

    const handleDraftOptionCorrectChange = (qIndex: number, oIndex: number) => {
        if (!draftQuestions) return;
        const updated = [...draftQuestions];
        updated[qIndex].options.forEach((opt, idx) => {
            opt.isCorrect = idx === oIndex;
        });
        setDraftQuestions(updated);
    };

    const handleRemoveDraftQuestion = (qIndex: number) => {
        if (!draftQuestions) return;
        const updated = draftQuestions.filter((_, idx) => idx !== qIndex);
        setDraftQuestions(updated.length > 0 ? updated : null);
    };

    const handleDeleteQuestion = async (questionId: number, questionText: string) => {
        const result = await Swal.fire({
            title: 'Confirm delete question?',
            html: `Are you sure you want to delete the question <strong>"${questionText}"</strong>?<br><br>
                   <span style="color: #dc2626;">All options will be deleted!</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            deleteQuestionMutation.mutate(questionId);
        }
    };

    const handleDeleteOption = async (optionId: number) => {
        const result = await Swal.fire({
            title: 'Confirm delete option?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
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
            showErrorAlert('Please select a video');
            return;
        }

        if (!markerQuestionId) {
            showErrorAlert('Please select a question');
            return;
        }

        createMarkerMutation.mutate();
    };

    const handleDeleteMarker = async (markerId: number) => {
        const result = await Swal.fire({
            title: 'Confirm delete marker?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
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
                    <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-zinc-900 dark:text-white mb-4">
                        Quiz not found
                    </p>
                    <Button onClick={() => navigate(-1)}>Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-3 sm:mb-4 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                        Manage Quiz
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 break-words">{quiz.title}</p>
                    {quiz.timeLimitInMinutes && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
                            Time Limit: {quiz.timeLimitInMinutes} minutes
                        </p>
                    )}
                </div>

                {/* Video Quiz Markers */}
                <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                                Embedded In-Video Quiz
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Select a video, find the timestamp on the timeline, and attach a question from this quiz to the video.
                            </p>
                        </div>
                    </div>

                    {quiz.availableVideoContents.length === 0 ? (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                            This course has no videos to attach markers to.
                        </div>
                    ) : quiz.questions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
                            Please create at least one question before adding a marker.
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-5">
                            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
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
                                        Question
                                    </label>
                                    <select
                                        value={markerQuestionId ?? ''}
                                        onChange={(e) => setMarkerQuestionId(Number(e.target.value))}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        {quiz.questions.map((question, index) => (
                                            <option key={question.id} value={question.id}>
                                                Question {index + 1}: {question.questionText}
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
                                    Your browser does not support the video tag.
                                </video>
                            )}

                            <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 sm:gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Timestamp (seconds)
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
                                        Mode
                                    </label>
                                    <select
                                        value={markerBlockingMode}
                                        onChange={(e) => setMarkerBlockingMode(e.target.value as 'pause' | 'non-blocking')}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        <option value="pause">Pause video</option>
                                        <option value="non-blocking">Non-blocking</option>
                                    </select>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleUseCurrentVideoTime}
                                    disabled={!selectedVideo?.videoUrl}
                                    className="w-full sm:w-auto sm:col-span-2 lg:col-span-1"
                                >
                                    Get Current Time
                                </Button>
                            </div>

                            <Button
                                onClick={handleCreateMarker}
                                disabled={createMarkerMutation.isPending}
                                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                            >
                                {createMarkerMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Marker
                                    </>
                                )}
                            </Button>

                            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                                <h3 className="font-medium text-zinc-900 dark:text-white mb-3">
                                    Markers on Selected Video
                                </h3>
                                {selectedVideoMarkers.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        No markers on this video yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedVideoMarkers.map((marker) => {
                                            const questionIndex = quiz.questions.findIndex((question) => question.id === marker.questionId);
                                            return (
                                                <div
                                                    key={marker.id}
                                                    className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                                                >
                                                    <span className="font-mono text-xs sm:text-sm text-red-600 dark:text-red-400 shrink-0">
                                                        {formatTime(marker.timestampSec)}
                                                    </span>
                                                    <span className="flex-1 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 min-w-0 break-words">
                                                        Question {questionIndex >= 0 ? questionIndex + 1 : '?'}: {quiz.questions[questionIndex]?.questionText ?? 'Deleted question'}
                                                    </span>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                                                        {marker.blockingMode === 'pause' ? 'Pause' : 'Non-blocking'}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
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
                    {/* Add Question / AI Generate Buttons */}
                    {!isAddingQuestion && !showAIForm && !draftQuestions && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="p-4 border-dashed border-2 border-zinc-300 dark:border-zinc-700">
                                <Button
                                    onClick={() => setIsAddingQuestion(true)}
                                    variant="ghost"
                                    className="w-full gap-2 text-zinc-600 dark:text-zinc-400"
                                >
                                    <Plus className="h-5 w-5" />
                                    Add New Question
                                </Button>
                            </Card>
                            <Card className="p-4 border-dashed border-2 border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/5">
                                <Button
                                    onClick={() => setShowAIForm(true)}
                                    variant="ghost"
                                    className="w-full gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/55"
                                >
                                    <Sparkles className="h-5 w-5" />
                                    Generate with AI
                                </Button>
                            </Card>
                        </div>
                    )}

                    {/* AI Configuration Form */}
                    {showAIForm && (
                        <Card className="p-4 sm:p-6 border-2 border-red-500 bg-white dark:bg-zinc-900 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-red-600" />
                                    Generate Questions with AI
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAIForm(false)}
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Number of Questions (1-15)
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={15}
                                        value={aiNumQuestions}
                                        onChange={(e) => setAiNumQuestions(Math.max(1, Math.min(15, Number(e.target.value))))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                        Difficulty Level
                                    </label>
                                    <select
                                        value={aiDifficulty}
                                        onChange={(e) => setAiDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAIForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => generateAIMutation.mutate({ numQuestions: aiNumQuestions, difficulty: aiDifficulty })}
                                    disabled={generateAIMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {generateAIMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* AI Draft Editor (Unsaved Questions) */}
                    {draftQuestions && (
                        <div className="space-y-4 border-2 border-red-500 rounded-xl p-4 bg-red-50/5 dark:bg-red-950/5 mb-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-700">
                                <div>
                                    <h3 className="font-bold text-lg sm:text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-red-600" />
                                        AI Quiz Draft (Unsaved)
                                    </h3>
                                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                        Review, edit, and click Save to append these questions to the quiz.
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDraftQuestions(null)}
                                        className="text-xs sm:text-sm"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        onClick={() => saveBatchQuestionsMutation.mutate(draftQuestions)}
                                        disabled={saveBatchQuestionsMutation.isPending}
                                        className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
                                    >
                                        {saveBatchQuestionsMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save to Quiz
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {draftQuestions.map((q, qIndex) => (
                                    <Card key={qIndex} className="p-4 sm:p-5 relative border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-3 right-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                            onClick={() => handleRemoveDraftQuestion(qIndex)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                                    Question {qIndex + 1}
                                                </label>
                                                <Input
                                                    value={q.questionText}
                                                    onChange={(e) => handleDraftQuestionTextChange(qIndex, e.target.value)}
                                                    className="font-medium text-sm sm:text-base pr-10"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                                                    Options (Mark the correct answer)
                                                </label>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    {q.options.map((opt, oIndex) => (
                                                        <div
                                                            key={oIndex}
                                                            className={`flex items-center gap-2 p-2 rounded-lg border ${opt.isCorrect
                                                                ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                                                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`correct-draft-${qIndex}`}
                                                                checked={opt.isCorrect}
                                                                onChange={() => handleDraftOptionCorrectChange(qIndex, oIndex)}
                                                                className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                            />
                                                            <Input
                                                                value={opt.optionText}
                                                                onChange={(e) => handleDraftOptionTextChange(qIndex, oIndex, e.target.value)}
                                                                className="h-8 text-xs sm:text-sm flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {q.explanation && (
                                                <div>
                                                    <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                                        Explanation
                                                    </label>
                                                    <Input
                                                        value={q.explanation}
                                                        onChange={(e) => {
                                                            const updated = [...draftQuestions];
                                                            updated[qIndex].explanation = e.target.value;
                                                            setDraftQuestions(updated);
                                                        }}
                                                        className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Question Card Form (Standard Manual entry) */}
                    {isAddingQuestion && (
                        <Card className="p-3 sm:p-4 border-2 border-red-500 bg-white dark:bg-zinc-900">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Enter question..."
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
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleAddQuestion}
                                        disabled={
                                            !newQuestionText.trim() ||
                                            createQuestionMutation.isPending
                                        }
                                        className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
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
                                        className="flex-1 sm:flex-none"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Questions */}
                    {quiz.questions.length === 0 ? (
                        <Card className="p-12 text-center">
                            <p className="text-zinc-500 dark:text-zinc-400">
                                No questions yet. Add the first question!
                            </p>
                        </Card>
                    ) : (
                        quiz.questions.map((question, index) => (
                            <Card key={question.id} className="p-4 sm:p-6">
                                {/* Question Header */}
                                <div className="flex items-start justify-between gap-2 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white mb-1 break-words">
                                            Question {index + 1}: {question.questionText}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                            {question.options.length} options
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
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
                                            className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border ${option.isCorrect
                                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                                                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                }`}
                                        >
                                            {option.isCorrect ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-zinc-400 flex-shrink-0" />
                                            )}
                                            <p className="flex-1 text-sm sm:text-base text-zinc-900 dark:text-white break-words min-w-0">
                                                {option.optionText}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
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
                                            placeholder="Enter option..."
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
                                                Correct option
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
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Add Option
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
                                                Cancel
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
                                        Add Option
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


