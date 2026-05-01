import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
    ArrowLeft,
    Upload,
    Sparkles,
    Loader2,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Save,
    FileText,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type LessonType = 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'PRACTICE';

type ParsedLesson = {
    title: string;
    type: LessonType;
    description: string;
};

type ParsedChapter = {
    title: string;
    lessons: ParsedLesson[];
};

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
    VIDEO: 'Video',
    DOCUMENT: 'Tài liệu',
    QUIZ: 'Bài kiểm tra',
    PRACTICE: 'Bài thực hành',
};

const LESSON_TYPES: LessonType[] = ['VIDEO', 'DOCUMENT', 'QUIZ', 'PRACTICE'];

function normalizeType(t: string | undefined): LessonType {
    const upper = (t || 'VIDEO').toString().toUpperCase();
    return (LESSON_TYPES as string[]).includes(upper) ? (upper as LessonType) : 'VIDEO';
}

export default function SyllabusImport() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<'paste' | 'upload'>('paste');
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [chapters, setChapters] = useState<ParsedChapter[]>([]);

    const parseMutation = useMutation({
        mutationFn: async () => {
            if (mode === 'upload' && file) {
                const fd = new FormData();
                fd.append('file', file);
                const { data } = await apiClient.post(
                    `/courses/${courseId}/syllabus/parse`,
                    fd,
                    { headers: { 'Content-Type': 'multipart/form-data' } },
                );
                return data;
            }
            const { data } = await apiClient.post(`/courses/${courseId}/syllabus/parse`, {
                text,
            });
            return data;
        },
        onSuccess: (data: { chapters: ParsedChapter[] }) => {
            const cleaned: ParsedChapter[] = (data.chapters ?? []).map((c) => ({
                title: c.title || '',
                lessons: (c.lessons ?? []).map((l) => ({
                    title: l.title || '',
                    type: normalizeType(l.type as string),
                    description: l.description || '',
                })),
            }));
            setChapters(cleaned);
            showSuccessAlert(
                'Phân tích thành công',
                `Đã trích xuất ${cleaned.length} chương. Bạn có thể chỉnh sửa trước khi lưu.`,
            );
        },
        onError: (error: any) => {
            showErrorAlert(
                'Lỗi phân tích',
                error.response?.data?.error || 'Không thể phân tích đề cương. Hãy thử lại.',
            );
        },
    });

    const commitMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(
                `/courses/${courseId}/syllabus/commit`,
                { chapters },
            );
            return data;
        },
        onSuccess: (data: { created: number }) => {
            showSuccessAlert(
                'Đã lưu',
                `Đã tạo ${data.created} chương vào khoá học.`,
            );
            navigate(`/courses/${courseId}/manage`);
        },
        onError: (error: any) => {
            showErrorAlert(
                'Lỗi lưu cấu trúc',
                error.response?.data?.error || 'Không thể lưu cấu trúc. Hãy thử lại.',
            );
        },
    });

    const handleParse = () => {
        if (mode === 'paste' && !text.trim()) {
            showErrorAlert('Thiếu nội dung', 'Vui lòng dán nội dung đề cương.');
            return;
        }
        if (mode === 'upload' && !file) {
            showErrorAlert('Chưa chọn tệp', 'Vui lòng chọn tệp .txt hoặc .md.');
            return;
        }
        parseMutation.mutate();
    };

    const handleCommit = () => {
        if (chapters.length === 0) {
            showErrorAlert('Trống', 'Không có chương nào để lưu.');
            return;
        }
        commitMutation.mutate();
    };

    const updateChapterTitle = (index: number, title: string) => {
        setChapters((prev) =>
            prev.map((c, i) => (i === index ? { ...c, title } : c)),
        );
    };

    const removeChapter = (index: number) => {
        setChapters((prev) => prev.filter((_, i) => i !== index));
    };

    const moveChapter = (index: number, direction: -1 | 1) => {
        setChapters((prev) => {
            const next = [...prev];
            const target = index + direction;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const addChapter = () => {
        setChapters((prev) => [
            ...prev,
            { title: 'Chương mới', lessons: [] },
        ]);
    };

    const updateLesson = (
        chapterIndex: number,
        lessonIndex: number,
        patch: Partial<ParsedLesson>,
    ) => {
        setChapters((prev) =>
            prev.map((c, i) =>
                i !== chapterIndex
                    ? c
                    : {
                          ...c,
                          lessons: c.lessons.map((l, j) =>
                              j === lessonIndex ? { ...l, ...patch } : l,
                          ),
                      },
            ),
        );
    };

    const removeLesson = (chapterIndex: number, lessonIndex: number) => {
        setChapters((prev) =>
            prev.map((c, i) =>
                i !== chapterIndex
                    ? c
                    : { ...c, lessons: c.lessons.filter((_, j) => j !== lessonIndex) },
            ),
        );
    };

    const moveLesson = (
        chapterIndex: number,
        lessonIndex: number,
        direction: -1 | 1,
    ) => {
        setChapters((prev) =>
            prev.map((c, i) => {
                if (i !== chapterIndex) return c;
                const next = [...c.lessons];
                const target = lessonIndex + direction;
                if (target < 0 || target >= next.length) return c;
                [next[lessonIndex], next[target]] = [next[target], next[lessonIndex]];
                return { ...c, lessons: next };
            }),
        );
    };

    const addLesson = (chapterIndex: number) => {
        setChapters((prev) =>
            prev.map((c, i) =>
                i !== chapterIndex
                    ? c
                    : {
                          ...c,
                          lessons: [
                              ...c.lessons,
                              { title: 'Bài học mới', type: 'VIDEO', description: '' },
                          ],
                      },
            ),
        );
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="container mx-auto max-w-5xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/courses/${courseId}/manage`)}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại quản lý khoá học
                </Button>

                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="h-7 w-7 text-red-600" />
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        Tạo cấu trúc khoá học bằng AI
                    </h1>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Dán đề cương hoặc tải tệp .txt/.md. AI sẽ trích xuất các chương và bài học.
                    Bạn có thể chỉnh sửa, sắp xếp lại trước khi lưu.
                </p>

                {/* Input mode tabs */}
                <Card className="p-6 mb-6">
                    <div className="flex gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setMode('paste')}
                            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                                mode === 'paste'
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            Dán nội dung
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('upload')}
                            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                                mode === 'upload'
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            Tải tệp lên
                        </button>
                    </div>

                    {mode === 'paste' ? (
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={10}
                            placeholder="Dán nội dung đề cương ở đây... (VD: Chương 1: ..., Bài 1.1: ...)"
                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        />
                    ) : (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.md,text/plain,text/markdown"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-md border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center hover:border-red-500 transition-colors"
                            >
                                <Upload className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                    {file ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            {file.name} ({Math.round(file.size / 1024)} KB)
                                        </span>
                                    ) : (
                                        'Nhấn để chọn tệp .txt hoặc .md (tối đa 5MB)'
                                    )}
                                </p>
                            </button>
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={handleParse}
                            disabled={parseMutation.isPending}
                            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {parseMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            Phân tích bằng AI
                        </Button>
                    </div>
                </Card>

                {/* Parsed structure */}
                {chapters.length > 0 && (
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                Cấu trúc đã trích xuất ({chapters.length} chương)
                            </h2>
                            <Button
                                onClick={handleCommit}
                                disabled={commitMutation.isPending}
                                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {commitMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Lưu vào khoá học
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {chapters.map((chapter, ci) => (
                                <div
                                    key={ci}
                                    className="rounded-md border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-800"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 w-12">
                                            Ch. {ci + 1}
                                        </span>
                                        <Input
                                            value={chapter.title}
                                            onChange={(e) =>
                                                updateChapterTitle(ci, e.target.value)
                                            }
                                            placeholder="Tên chương"
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveChapter(ci, -1)}
                                            disabled={ci === 0}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveChapter(ci, 1)}
                                            disabled={ci === chapters.length - 1}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeChapter(ci)}
                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="ml-12 space-y-2">
                                        {chapter.lessons.map((lesson, li) => (
                                            <div
                                                key={li}
                                                className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 p-2 bg-zinc-50 dark:bg-zinc-900"
                                            >
                                                <span className="text-xs font-mono text-zinc-500 w-12">
                                                    {ci + 1}.{li + 1}
                                                </span>
                                                <Input
                                                    value={lesson.title}
                                                    onChange={(e) =>
                                                        updateLesson(ci, li, {
                                                            title: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Tên bài học"
                                                    className="flex-1"
                                                />
                                                <select
                                                    value={lesson.type}
                                                    onChange={(e) =>
                                                        updateLesson(ci, li, {
                                                            type: e.target.value as LessonType,
                                                        })
                                                    }
                                                    className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                                                >
                                                    {LESSON_TYPES.map((t) => (
                                                        <option key={t} value={t}>
                                                            {LESSON_TYPE_LABELS[t]}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => moveLesson(ci, li, -1)}
                                                    disabled={li === 0}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => moveLesson(ci, li, 1)}
                                                    disabled={li === chapter.lessons.length - 1}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeLesson(ci, li)}
                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addLesson(ci)}
                                            className="gap-2 border-dashed"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Thêm bài học
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                onClick={addChapter}
                                className="w-full gap-2 border-dashed"
                            >
                                <Plus className="h-4 w-4" />
                                Thêm chương
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
