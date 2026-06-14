import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Github,
    Send,
    Loader2,
    GitCommit,
    ExternalLink,
    Award,
    MessageSquare,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type Project = {
    id: number;
    title: string;
    description: string;
    requirements: string | null;
    deadline: string | null;
};

type Commit = {
    sha: string;
    message: string;
    authorName: string;
    authorDate: string;
    htmlUrl: string;
};

type Submission = {
    id: number;
    repoUrl: string;
    commitsJson: Commit[] | null;
    lastFetchedAt: string | null;
    teacherFeedback: string | null;
    teacherGrade: number | null;
    submittedAt: string;
};

function ProjectCard({ project }: { project: Project }) {
    const queryClient = useQueryClient();
    const [repoUrl, setRepoUrl] = useState('');

    const { data: submission, isLoading } = useQuery<Submission | null>({
        queryKey: ['my-submission', project.id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/${project.id}/my-submission`);
            return data;
        },
    });

    const submit = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/projects/${project.id}/submit`, { repoUrl: repoUrl.trim() });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['my-submission', project.id] });
            setRepoUrl('');
            showSuccessAlert('Đã nộp bài', data.githubNote ?? 'Đã lấy commits từ GitHub.');
        },
        onError: (err: any) =>
            showErrorAlert('Lỗi nộp', err.response?.data?.error ?? 'Không nộp được'),
    });

    return (
        <Card className="p-5 mb-4" data-testid={`project-${project.id}`}>
            <h3 className="text-xl font-bold mb-1">{project.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{project.description}</p>
            {project.requirements && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
                    <strong>Yêu cầu:</strong> {project.requirements}
                </p>
            )}
            {project.deadline && (
                <p className="text-xs text-amber-600 mb-2">
                    Deadline: {new Date(project.deadline).toLocaleDateString('vi-VN')}
                </p>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}

                {!isLoading && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {submission ? 'Cập nhật repo URL' : 'Nộp repo GitHub của bạn'}
                        </label>
                        <div className="flex gap-2">
                            <Input
                                data-testid={`repo-${project.id}`}
                                placeholder="https://github.com/yourname/yourrepo"
                                value={repoUrl || submission?.repoUrl || ''}
                                onChange={(e) => setRepoUrl(e.target.value)}
                            />
                            <Button
                                data-testid={`submit-${project.id}`}
                                onClick={() => submit.mutate()}
                                disabled={submit.isPending || !(repoUrl || '').trim()}
                                className="gap-1"
                            >
                                {submit.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <><Send className="h-4 w-4" /> Nộp</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {submission && (
                    <div className="mt-4 space-y-3" data-testid={`submission-${project.id}`}>
                        <a
                            href={submission.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <Github className="h-3 w-3" /> {submission.repoUrl}
                        </a>

                        {submission.teacherGrade !== null && (
                            <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300">
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <Award className="h-4 w-4" /> Điểm: {submission.teacherGrade}/100
                                </p>
                                {submission.teacherFeedback && (
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 flex items-start gap-1">
                                        <MessageSquare className="h-4 w-4 mt-0.5" /> {submission.teacherFeedback}
                                    </p>
                                )}
                            </Card>
                        )}

                        <div>
                            <p className="text-sm font-semibold mb-2">
                                Commits ({submission.commitsJson?.length ?? 0})
                            </p>
                            {submission.commitsJson && submission.commitsJson.length > 0 ? (
                                <ul className="space-y-2 max-h-64 overflow-y-auto" data-testid={`commits-${project.id}`}>
                                    {submission.commitsJson.map((c) => (
                                        <li
                                            key={c.sha}
                                            className="text-sm border-l-2 border-slate-300 dark:border-slate-700 pl-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <code className="text-xs text-slate-500">{c.sha.slice(0, 7)}</code>
                                                <a href={c.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                            <p className="font-medium text-slate-700 dark:text-slate-300">
                                                {c.message.split('\n')[0]}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {c.authorName} • {new Date(c.authorDate).toLocaleString('vi-VN')}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                    <GitCommit className="h-3 w-3" /> Chưa có commit nào (hoặc chưa lấy được).
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

export default function StudentProjects() {
    const { courseId } = useParams<{ courseId: string }>();

    const { data: projects = [], isLoading } = useQuery<Project[]>({
        queryKey: ['student-projects', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}/projects`);
            return data;
        },
        enabled: !!courseId,
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="mb-6">
                    <Link to={`/learning/${courseId}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" /> Về trang học
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-6">Project-based assignments</h1>

                {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
                {!isLoading && projects.length === 0 && (
                    <Card className="p-8 text-center text-slate-500">
                        Khoá học này chưa có project nào.
                    </Card>
                )}

                {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                ))}
            </div>
        </div>
    );
}
