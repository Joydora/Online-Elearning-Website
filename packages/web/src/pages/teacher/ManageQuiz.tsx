import { useState } from 'react';
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

type QuizDetail = {
    id: number;
    title: string;
    timeLimitInMinutes: number | null;
    questions: Question[];
};

export default function ManageQuiz() {
    const { contentId } = useParams<{ contentId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [addingOptionsFor, setAddingOptionsFor] = useState<number | null>(null);
    const [newOptionText, setNewOptionText] = useState('');
    const [newOptionIsCorrect, setNewOptionIsCorrect] = useState(false);

    // Fetch quiz with questions
    const { data: quiz, isLoading } = useQuery<QuizDetail>({
        queryKey: ['quiz-manage', contentId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/quiz/${contentId}/manage`);
            return data;
        },
        enabled: !!contentId,
    });

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

    if (!quiz) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-900 dark:text-white mb-4">
                        Không tìm thấy bài kiểm tra
                    </p>
                    <Button onClick={() => navigate(-1)}>Quay lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="mb-4 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Quay lại
                    </Button>

                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Quản lý bài kiểm tra
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">{quiz.title}</p>
                    {quiz.timeLimitInMinutes && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            Thời gian: {quiz.timeLimitInMinutes} phút
                        </p>
                    )}
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                    {/* Add Question Button */}
                    {!isAddingQuestion ? (
                        <Card className="p-4 border-dashed border-2 border-gray-300 dark:border-gray-700">
                            <Button
                                onClick={() => setIsAddingQuestion(true)}
                                variant="ghost"
                                className="w-full gap-2 text-gray-600 dark:text-gray-400"
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
                            <p className="text-gray-500 dark:text-gray-400">
                                Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!
                            </p>
                        </Card>
                    ) : (
                        quiz.questions.map((question, index) => (
                            <Card key={question.id} className="p-6">
                                {/* Question Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            Câu {index + 1}: {question.questionText}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {question.options.length} đáp án
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                                                option.isCorrect
                                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            {option.isCorrect ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            )}
                                            <p className="flex-1 text-gray-900 dark:text-white">
                                                {option.optionText}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                                                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                                            />
                                            <label
                                                htmlFor={`correct-${question.id}`}
                                                className="text-sm text-gray-700 dark:text-gray-300"
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

