import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Github, Star, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showErrorAlert, showSuccessAlert } from '../../lib/sweetalert';
import Swal from 'sweetalert2';

type Commit = { sha: string; message: string; author: string; date: string; url: string };

type Submission = {
    id: number;
    repoUrl: string;
    commitHistory: Commit[];
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
    student: { id: number; username: string; firstName: string | null; lastName: string | null; email: string };
};

type Project = {
    id: number;
    title: string;
    description: string;
    requirements: string;
    deadline: string | null;
    createdAt: string;
    _count?: { submissions: number };
};

type ProjectForm = {
    title: string;
    description: string;
    requirements: string;
    deadline: string;
};

function GradeModal({ submission, onClose, onSaved }: { submission: Submission; onClose: () => void; onSaved: () => void }) {
    const [grade, setGrade] = useState<string>(submission.grade !== null ? String(submission.grade) : '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const g = Number(grade);
        if (grade !== '' && (!Number.isFinite(g) || g < 0 || g > 10)) {
            showErrorAlert('Lỗi', 'Điểm phải là số từ 0 đến 10');
            return;
        }
        setSaving(true);
        try {
            await apiClient.put(`/projects/submissions/${submission.id}/grade`, {
                feedback: feedback || undefined,
                grade: grade !== '' ? g : undefined,
            });
            await showSuccessAlert('Đã lưu', 'Đã lưu đánh giá thành công.');
            onSaved();
            onClose();
        } catch {
            showErrorAlert('Lỗi', 'Không thể lưu đánh giá.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                    Đánh giá: {submission.student.firstName || submission.student.username}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Repo URL
                        </label>
                        <a href={submission.repoUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-red-600 hover:underline flex items-center gap-1">
                            {submission.repoUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                    {submission.commitHistory.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Commits ({submission.commitHistory.length})
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {submission.commitHistory.map(c => (
                                    <div key={c.sha} className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-2 py-1.5">
                                        <code className="text-red-600 font-mono">{c.sha}</code>
                                        <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">{c.message}</span>
                                        <span className="text-zinc-400">{new Date(c.date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Điểm (0–10)
                        </label>
                        <Input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={grade}
                            onChange={e => setGrade(e.target.value)}
                            placeholder="Nhập điểm..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Nhận xét
                        </label>
                        <textarea
                            className="w-full h-28 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Nhận xét cho sinh viên..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
                        <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Lưu đánh giá
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function ManageProjects() {
    const { id: courseId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [expandedProject, setExpandedProject] = useState<number | null>(null);
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [form, setForm] = useState<ProjectForm>({ title: '', description: '', requirements: '', deadline: '' });

    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ['teacher-projects', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/courses/${courseId}/projects`);
            return data;
        },
        enabled: !!courseId,
    });

    const { data: submissions } = useQuery<Submission[]>({
        queryKey: ['project-submissions', expandedProject],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/${expandedProject}/submissions`);
            return data;
        },
        enabled: !!expandedProject,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (editingProject) {
                await apiClient.put(`/projects/${editingProject.id}`, form);
            } else {
                await apiClient.post('/projects', { ...form, courseId: Number(courseId) });
            }
        },
        onSuccess: async () => {
            await showSuccessAlert('Đã lưu', 'Dự án đã được lưu thành công.');
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['teacher-projects', courseId] });
        },
        onError: () => showErrorAlert('Lỗi', 'Không thể lưu dự án.'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-projects', courseId] });
        },
        onError: () => showErrorAlert('Lỗi', 'Không thể xóa dự án.'),
    });

    const handleDelete = async (project: Project) => {
        const result = await Swal.fire({
            title: 'Xác nhận xóa',
            text: `Bạn có chắc chắn muốn xóa dự án "${project.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Xóa',
        });
        if (result.isConfirmed) deleteMutation.mutate(project.id);
    };

    const openEdit = (project: Project) => {
        setEditingProject(project);
        setForm({
            title: project.title,
            description: project.description,
            requirements: project.requirements,
            deadline: project.deadline ? project.deadline.substring(0, 16) : '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingProject(null);
        setForm({ title: '', description: '', requirements: '', deadline: '' });
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Github className="w-6 h-6 text-red-600" />
                    Quản lý dự án
                </h1>
                <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 hover:bg-red-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Thêm dự án
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <Card className="p-6 mb-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                        {editingProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tên dự án *</label>
                            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Tên dự án..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mô tả *</label>
                            <textarea
                                className="w-full h-24 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Mô tả dự án..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Yêu cầu *</label>
                            <textarea
                                className="w-full h-32 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-mono"
                                value={form.requirements}
                                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                                placeholder="Liệt kê yêu cầu dự án..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hạn nộp (tùy chọn)</label>
                            <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={resetForm} disabled={saveMutation.isPending}>Hủy</Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending || !form.title || !form.description || !form.requirements}
                                className="bg-red-600 hover:bg-red-700 gap-2"
                            >
                                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingProject ? 'Cập nhật' : 'Tạo dự án'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Project list */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Đang tải...</div>
            ) : (projects ?? []).length === 0 ? (
                <Card className="p-12 text-center text-zinc-500">Chưa có dự án nào. Hãy tạo dự án đầu tiên!</Card>
            ) : (
                <div className="space-y-4">
                    {(projects ?? []).map(project => (
                        <Card key={project.id} className="overflow-hidden">
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{project.title}</h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{project.description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                                            <span>{project._count?.submissions ?? 0} bài nộp</span>
                                            {project.deadline && (
                                                <span>Hạn: {new Date(project.deadline).toLocaleDateString('vi-VN')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(project)} className="gap-1">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(project)} className="gap-1 text-red-500 hover:text-red-700">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                                            className="gap-1"
                                        >
                                            {expandedProject === project.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            Bài nộp
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {expandedProject === project.id && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 p-5">
                                    {!submissions ? (
                                        <div className="text-center py-4 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                                    ) : submissions.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-4">Chưa có bài nộp nào</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {submissions.map(sub => {
                                                const name = [sub.student.firstName, sub.student.lastName].filter(Boolean).join(' ') || sub.student.username;
                                                return (
                                                    <div key={sub.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{name}</p>
                                                            <p className="text-xs text-zinc-500">{sub.student.email}</p>
                                                            <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline flex items-center gap-1 mt-1">
                                                                <Github className="w-3 h-3" />
                                                                {sub.repoUrl}
                                                            </a>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            {sub.grade !== null ? (
                                                                <p className={`font-bold text-lg ${sub.grade >= 8 ? 'text-green-600' : sub.grade >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {sub.grade}/10
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-zinc-400">Chưa chấm</p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setGradingSubmission(sub)}
                                                            className="bg-red-600 hover:bg-red-700 gap-1 flex-shrink-0"
                                                        >
                                                            <Star className="w-3.5 h-3.5" />
                                                            Chấm điểm
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {gradingSubmission && (
                <GradeModal
                    submission={gradingSubmission}
                    onClose={() => setGradingSubmission(null)}
                    onSaved={() => queryClient.invalidateQueries({ queryKey: ['project-submissions', expandedProject] })}
                />
            )}
        </div>
    );
}
