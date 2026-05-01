import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Github, Send, RefreshCw, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';

type Commit = {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
};

type Submission = {
    id: number;
    repoUrl: string;
    commitHistory: Commit[];
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
};

type Project = {
    id: number;
    title: string;
    description: string;
    requirements: string;
    deadline: string | null;
    createdAt: string;
    submission?: Submission | null;
};

function ProjectCard({ project, courseId }: { project: Project; courseId: string }) {
    const queryClient = useQueryClient();
    const [repoUrl, setRepoUrl] = useState(project.submission?.repoUrl || '');
    const [expanded, setExpanded] = useState(false);

    const submitMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/projects/${project.id}/submit`, { repoUrl });
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert('Nộp bài thành công!', 'Bài nộp của bạn đã được ghi lại.');
            queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
        },
        onError: (e: any) => showErrorAlert('Lỗi', e.response?.data?.error || 'Không thể nộp bài.'),
    });

    const refreshMutation = useMutation({
        mutationFn: async () => {
            if (!project.submission) return;
            const { data } = await apiClient.post(`/projects/submissions/${project.submission.id}/refresh-commits`);
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert('Cập nhật thành công!', 'Danh sách commit đã được làm mới.');
            queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
        },
        onError: (e: any) => showErrorAlert('Lỗi', e.response?.data?.error || 'Không thể cập nhật commits.'),
    });

    const isPastDeadline = project.deadline && new Date(project.deadline) < new Date();

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{project.title}</h3>
                    {project.deadline && (
                        <div className={`flex items-center gap-1 text-sm mt-1 ${isPastDeadline ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            Hạn nộp: {new Date(project.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {isPastDeadline && ' (Đã hết hạn)'}
                        </div>
                    )}
                </div>
                {project.submission?.grade !== null && project.submission?.grade !== undefined && (
                    <div className="text-right flex-shrink-0">
                        <p className={`text-2xl font-bold ${project.submission.grade >= 8 ? 'text-green-600' : project.submission.grade >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {project.submission.grade}/10
                        </p>
                        <p className="text-xs text-zinc-500">Điểm số</p>
                    </div>
                )}
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{project.description}</p>

            <button
                className="text-sm text-red-600 hover:underline flex items-center gap-1 mb-4"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Ẩn yêu cầu' : 'Xem yêu cầu chi tiết'}
            </button>

            {expanded && (
                <pre className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 whitespace-pre-wrap mb-4 border border-zinc-200 dark:border-zinc-700">
                    {project.requirements}
                </pre>
            )}

            {/* Feedback */}
            {project.submission?.feedback && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Nhận xét từ giảng viên:</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{project.submission.feedback}</p>
                </div>
            )}

            {/* Submit form */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            className="pl-9"
                            placeholder="https://github.com/username/repo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending || !repoUrl.trim()}
                        className="bg-red-600 hover:bg-red-700 gap-1"
                    >
                        {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {project.submission ? 'Cập nhật' : 'Nộp bài'}
                    </Button>
                </div>

                {project.submission && (
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                            Đã nộp lúc {new Date(project.submission.submittedAt).toLocaleString('vi-VN')}
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => refreshMutation.mutate()}
                            disabled={refreshMutation.isPending}
                            className="ml-auto gap-1 text-xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                            Làm mới commits
                        </Button>
                    </div>
                )}
            </div>

            {/* Commit history */}
            {project.submission?.commitHistory && project.submission.commitHistory.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1">
                        <Github className="w-4 h-4" />
                        Lịch sử commit ({project.submission.commitHistory.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {project.submission.commitHistory.map((c) => (
                            <div key={c.sha} className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2">
                                <code className="text-red-600 font-mono">{c.sha}</code>
                                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">{c.message}</span>
                                <span className="text-zinc-400 flex-shrink-0">{new Date(c.date).toLocaleDateString('vi-VN')}</span>
                                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600">
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

export default function Projects() {
    const { courseId } = useParams<{ courseId: string }>();

    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ['student-projects', courseId],
        queryFn: async () => {
            const { data: projectList } = await apiClient.get<Project[]>(`/courses/${courseId}/projects`);
            const results = await Promise.allSettled(
                projectList.map(async (p): Promise<Project> => {
                    try {
                        const { data: sub } = await apiClient.get<Submission>(`/projects/${p.id}/submissions/mine`);
                        return { ...p, submission: sub };
                    } catch {
                        return { ...p, submission: null };
                    }
                })
            );
            return results
                .filter((r): r is PromiseFulfilledResult<Project> => r.status === 'fulfilled')
                .map((r) => r.value);
        },
        enabled: !!courseId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                <Github className="w-6 h-6 text-red-600" />
                Dự án thực tế
            </h1>

            {!projects || projects.length === 0 ? (
                <Card className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                    Chưa có dự án nào được giao cho khóa học này.
                </Card>
            ) : (
                <div className="space-y-6">
                    {projects.map(p => <ProjectCard key={p.id} project={p} courseId={courseId!} />)}
                </div>
            )}
        </div>
    );
}
