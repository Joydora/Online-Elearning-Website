import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Send, History, CheckCircle2, AlertCircle } from 'lucide-react';

// @monaco-editor/react ships Monaco itself in workers — about 6 MB once
// uncompressed. Lazy-load so anyone who never opens a PRACTICE content
// (the vast majority of pageviews) doesn't pay the cost. Other learning
// pages (course player, progress) stay light.
const Editor = lazy(() => import('@monaco-editor/react'));
import { apiClient } from '../lib/api';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Practice = {
    id: number;
    contentId: number;
    title: string;
    prompt: string;
    starterCode: string | null;
    expectedOutput: string | null;
    language: string;
    latestSubmission: Submission | null;
};

type Submission = {
    id: number;
    practiceId: number;
    submittedCode: string;
    aiScore: number | null;
    aiFeedback: string | null;
    createdAt: string;
};

type Props = {
    contentId: number;
};

export function PracticePanel({ contentId }: Props) {
    const [code, setCode] = useState<string>('');
    const [showHistory, setShowHistory] = useState(false);

    const {
        data: practice,
        isLoading,
        refetch: refetchPractice,
    } = useQuery<Practice>({
        queryKey: ['practice', contentId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/practice/${contentId}`);
            return data;
        },
    });

    // Seed editor from starterCode / latestSubmission whenever practice changes.
    useEffect(() => {
        if (!practice) return;
        const initial =
            practice.latestSubmission?.submittedCode ??
            practice.starterCode ??
            '';
        setCode(initial);
    }, [practice?.id]);

    const {
        data: history,
        refetch: refetchHistory,
    } = useQuery<{ attempts: Submission[] }>({
        queryKey: ['practice-attempts', contentId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/practice/${contentId}/attempts`);
            return data;
        },
        enabled: showHistory,
    });

    const submit = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/practice/${contentId}/submit`, { code });
            return data as Submission;
        },
        onSuccess: () => {
            refetchPractice();
            if (showHistory) refetchHistory();
        },
    });

    if (isLoading || !practice) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Đang tải bài thực hành...
            </div>
        );
    }

    const latest = submit.data ?? practice.latestSubmission;

    return (
        <div className="w-full h-full flex p-4 gap-4 overflow-hidden">
            {/* Left: prompt + editor */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                <Card className="p-4 bg-white dark:bg-slate-800 flex-shrink-0">
                    <h2 className="text-xl font-bold mb-1">{practice.title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {practice.prompt}
                    </p>
                    {practice.expectedOutput && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Kết quả mong muốn: <code className="font-mono">{practice.expectedOutput}</code>
                        </p>
                    )}
                </Card>

                <Card className="flex-1 bg-white dark:bg-slate-800 overflow-hidden" data-testid="practice-editor-card">
                    <Suspense
                        fallback={
                            <div className="h-full flex items-center justify-center text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Đang tải editor...
                            </div>
                        }
                    >
                        <Editor
                            height="100%"
                            defaultLanguage={practice.language}
                            language={practice.language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value ?? '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </Suspense>
                </Card>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <Button
                        data-testid="practice-submit"
                        onClick={() => submit.mutate()}
                        disabled={submit.isPending || !code.trim()}
                        className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                        {submit.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang chấm...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Nộp bài
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowHistory((s) => !s)}
                        className="gap-2"
                    >
                        <History className="h-4 w-4" />
                        {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                    </Button>
                </div>
            </div>

            {/* Right: feedback + history */}
            <div className="w-96 flex flex-col gap-3 overflow-y-auto">
                <Card className="p-4 bg-white dark:bg-slate-800" data-testid="practice-feedback">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        {latest?.aiScore === null ? (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                        ) : latest ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : null}
                        Phản hồi AI
                    </h3>
                    {!latest && (
                        <p className="text-sm text-slate-500">
                            Chưa có bài nộp nào. Nộp bài để nhận phản hồi.
                        </p>
                    )}
                    {latest && (
                        <>
                            <div className="mb-2">
                                <span className="text-sm text-slate-500">Điểm: </span>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {latest.aiScore !== null ? latest.aiScore.toFixed(1) : 'N/A'}
                                </span>
                                {latest.aiScore !== null && <span className="text-sm text-slate-500"> / 10</span>}
                            </div>
                            <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                                {latest.aiFeedback ?? '(không có nhận xét)'}
                            </p>
                        </>
                    )}
                </Card>

                {showHistory && history && (
                    <Card className="p-4 bg-white dark:bg-slate-800">
                        <h3 className="font-semibold mb-2">
                            Lịch sử nộp ({history.attempts.length})
                        </h3>
                        {history.attempts.length === 0 && (
                            <p className="text-sm text-slate-500">Chưa có lần nộp nào.</p>
                        )}
                        <ul className="space-y-2 text-sm">
                            {history.attempts.map((a) => (
                                <li key={a.id} className="border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                                    <div className="text-xs text-slate-500">
                                        {new Date(a.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                    <div className="font-medium">
                                        Điểm: {a.aiScore !== null ? a.aiScore.toFixed(1) : 'N/A'}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {a.aiFeedback}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
        </div>
    );
}
