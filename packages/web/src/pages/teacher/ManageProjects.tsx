import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Save,
    Trash2,
    RefreshCw,
    Github,
    Loader2,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type Project = {
    id: number;
    courseId: number;
    title: string;
    description: string;
    requirements: string | null;
    deadline: string | null;
    createdAt: string;
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
    projectId: number;
    studentId: number;
    repoUrl: string;
    commitsJson: Commit[] | null;
    lastFetchedAt: string | null;
    teacherFeedback: string | null;
    teacherGrade: number | null;
    submittedAt: string;
    student: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
    };
};

function studentName(s: Submission['student']) {
    return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username;
}

function ProjectForm({
    courseId,
    project,
    onDone,
}: {
    courseId: string;
    project?: Project;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(project?.title ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [requirements, setRequirements] = useState(project?.requirements ?? '');
    const [deadline, setDeadline] = useState(project?.deadline ? project.deadline.slice(0, 10) : '');

    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                requirements: requirements.trim() || null,
                deadline: deadline ? new Date(deadline).toISOString() : null,
            };
            if (project) {
                const { data } = await apiClient.put(`/projects/${project.id}`, payload);
                return data;
            } else {
                const { data } = await apiClient.post(`/courses/${courseId}/projects`, payload);
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', courseId] });
            showSuccessAlert(project ? 'Đã cập nhật' : 'Đã tạo project');
            onDone();
        },
        onError: (err: any) => showErrorAlert('Lỗi', err.response?.data?.error ?? 'Không lưu được'),
    });

    return (
        <div className="space-y-3">
            <Input
                data-testid="project-title"
                placeholder="Tiêu đề"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
                data-testid="project-description"
                placeholder="Mô tả"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background"
            />
            <textarea
                data-testid="project-requirements"
                placeholder="Yêu cầu (optional)"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background"
            />
            <Input
                data-testid="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
            />
            <div className="flex gap-2">
                <Button
                    data-testid="project-save"
                    onClick={() => save.mutate()}
                    disabled={save.isPending || !title.trim() || !description.trim()}
                    className="gap-2"
                >
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu
                </Button>
                <Button variant="outline" onClick={onDone}>
                    Huỷ
                </Button>
            </div>
        </div>
    );
}

function SubmissionsPanel({ projectId }: { projectId: number }) {
    const queryClient = useQueryClient();
    const { data: submissions = [], isLoading } = useQuery<Submission[]>({
        queryKey: ['submissions', projectId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/${projectId}/submissions`);
            return data;
        },
    });

    const refresh = useMutation({
        mutationFn: async (id: number) => {
            const { data } = await apiClient.post(`/submissions/${id}/refresh`);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions', projectId] }),
        onError: (err: any) => showErrorAlert('Lỗi', err.response?.data?.error ?? 'Refresh thất bại'),
    });

    const grade = useMutation({
        mutationFn: async (vars: { id: number; feedback: string; grade: number | null }) => {
            const { data } = await apiClient.put(`/submissions/${vars.id}/grade`, {
                teacherFeedback: vars.feedback,
                teacherGrade: vars.grade,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions', projectId] });
            showSuccessAlert('Đã chấm điểm');
        },
        onError: (err: any) => showErrorAlert('Lỗi', err.response?.data?.error ?? 'Chấm thất bại'),
    });

    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

    if (submissions.length === 0) {
        return <p className="text-sm text-slate-500">Chưa có học viên nộp.</p>;
    }

    return (
        <div className="space-y-3" data-testid={`submissions-${projectId}`}>
            {submissions.map((s) => (
                <Card key={s.id} className="p-4 bg-slate-50 dark:bg-slate-900" data-testid={`submission-${s.id}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="font-semibold">{studentName(s.student)}</p>
                            <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <Github className="h-3 w-3" />
                                {s.repoUrl}
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                                {s.commitsJson?.length ?? 0} commit
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                data-testid={`refresh-${s.id}`}
                                onClick={() => refresh.mutate(s.id)}
                                disabled={refresh.isPending}
                                className="gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <GradingForm
                        submission={s}
                        onSubmit={(feedback, gradeNum) => grade.mutate({ id: s.id, feedback, grade: gradeNum })}
                        pending={grade.isPending}
                    />
                </Card>
            ))}
        </div>
    );
}

function GradingForm({ submission, onSubmit, pending }: { submission: Submission; onSubmit: (f: string, g: number | null) => void; pending: boolean }) {
    const [feedback, setFeedback] = useState(submission.teacherFeedback ?? '');
    const [grade, setGrade] = useState(submission.teacherGrade?.toString() ?? '');
    return (
        <div className="space-y-2 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
            <textarea
                data-testid={`feedback-${submission.id}`}
                placeholder="Nhận xét cho học viên"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
            <div className="flex items-center gap-2">
                <Input
                    data-testid={`grade-${submission.id}`}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Điểm 0-100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-32"
                />
                <Button
                    size="sm"
                    data-testid={`save-grade-${submission.id}`}
                    onClick={() => onSubmit(feedback, grade === '' ? null : Number(grade))}
                    disabled={pending}
                >
                    Lưu
                </Button>
            </div>
        </div>
    );
}

export default function ManageProjects() {
    const { id: courseId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const { data: projects = [], isLoading } = useQuery<Project[]>({
        queryKey: ['projects', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}/projects`);
            return data;
        },
        enabled: !!courseId,
    });

    const remove = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', courseId] });
            showSuccessAlert('Đã xoá project');
        },
        onError: (err: any) => showErrorAlert('Lỗi', err.response?.data?.error ?? 'Xoá thất bại'),
    });

    const toggle = (id: number) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                    <Link to={`/courses/${courseId}/manage`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" /> Về Manage
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-6">Project-based assignments</h1>

                {!adding && (
                    <Button data-testid="add-project" onClick={() => setAdding(true)} className="gap-2 mb-4">
                        <Plus className="h-4 w-4" /> Thêm project
                    </Button>
                )}

                {adding && (
                    <Card className="p-4 mb-6">
                        <h2 className="font-bold mb-3">Project mới</h2>
                        <ProjectForm courseId={courseId!} onDone={() => setAdding(false)} />
                    </Card>
                )}

                {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

                <div className="space-y-3">
                    {projects.map((p) => (
                        <Card key={p.id} className="p-4" data-testid={`project-${p.id}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">{p.title}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
                                    {p.deadline && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Deadline: {new Date(p.deadline).toLocaleDateString('vi-VN')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => toggle(p.id)}
                                        data-testid={`toggle-${p.id}`}
                                    >
                                        {expanded.has(p.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
                                        Sửa
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove.mutate(p.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            {editingId === p.id && (
                                <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <ProjectForm courseId={courseId!} project={p} onDone={() => setEditingId(null)} />
                                </div>
                            )}
                            {expanded.has(p.id) && (
                                <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                                    <h4 className="font-semibold mb-2">Bài nộp của học viên</h4>
                                    <SubmissionsPanel projectId={p.id} />
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
