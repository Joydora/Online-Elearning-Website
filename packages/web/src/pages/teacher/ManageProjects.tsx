import { useState, useEffect } from 'react';
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
    enablePeerReview?: boolean;
    peerReviewCount?: number;
    _count?: { submissions: number };
};

type ProjectForm = {
    title: string;
    description: string;
    requirements: string;
    deadline: string;
    enablePeerReview: boolean;
    peerReviewCount: number;
};

type RubricItem = {
    id?: number;
    criteria: string;
    description: string;
    maxScore: number;
};

function RubricModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
    const [rubrics, setRubrics] = useState<RubricItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchRubrics = async () => {
            try {
                const { data } = await apiClient.get(`/projects/${projectId}/rubric`);
                setRubrics(data);
            } catch {
                showErrorAlert('Error', 'Failed to load rubrics');
            } finally {
                setLoading(false);
            }
        };
        fetchRubrics();
    }, [projectId]);

    const handleAdd = () => {
        setRubrics([...rubrics, { criteria: '', description: '', maxScore: 10 }]);
    };

    const handleRemove = (index: number) => {
        setRubrics(rubrics.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (rubrics.some(r => !r.criteria.trim() || r.maxScore <= 0)) {
            showErrorAlert('Error', 'All criteria must have names and a maximum score greater than 0.');
            return;
        }
        setSaving(true);
        try {
            await apiClient.post(`/projects/${projectId}/rubric`, { rubrics });
            await showSuccessAlert('Saved', 'Rubric criteria saved successfully.');
            onClose();
        } catch (error: any) {
            showErrorAlert('Error', error.response?.data?.error || 'Failed to save rubric.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl p-4 sm:p-6 my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4">
                    Manage Project Rubrics
                </h3>
                {loading ? (
                    <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600" /></div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {rubrics.map((rubric, index) => (
                                <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2 relative">
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Criteria Name (e.g. Clean Code)"
                                                value={rubric.criteria}
                                                onChange={e => {
                                                    const updated = [...rubrics];
                                                    updated[index].criteria = e.target.value;
                                                    setRubrics(updated);
                                                }}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                placeholder="Max Score"
                                                value={rubric.maxScore}
                                                onChange={e => {
                                                    const updated = [...rubrics];
                                                    updated[index].maxScore = Number(e.target.value);
                                                    setRubrics(updated);
                                                }}
                                            />
                                        </div>
                                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0" onClick={() => handleRemove(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <textarea
                                        className="w-full h-16 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        placeholder="Description of this criteria..."
                                        value={rubric.description}
                                        onChange={e => {
                                            const updated = [...rubrics];
                                            updated[index].description = e.target.value;
                                            setRubrics(updated);
                                        }}
                                    />
                                </div>
                            ))}
                            {rubrics.length === 0 && (
                                <p className="text-sm text-zinc-500 text-center py-4">No rubric criteria added. Students will be graded out of 10 general points by default.</p>
                            )}
                        </div>

                        <Button variant="outline" size="sm" onClick={handleAdd} className="w-full gap-1">
                            <Plus className="w-4 h-4" /> Add Criteria
                        </Button>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                            <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Rubrics
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

function GradeModal({ submission, onClose, onSaved }: { submission: Submission; onClose: () => void; onSaved: () => void }) {
    const [grade, setGrade] = useState<string>(submission.grade !== null ? String(submission.grade) : '');
    const [feedback, setFeedback] = useState(submission.feedback || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const g = Number(grade);
        if (grade !== '' && (!Number.isFinite(g) || g < 0 || g > 10)) {
            showErrorAlert('Error', 'Grade must be a number between 0 and 10');
            return;
        }
        setSaving(true);
        try {
            await apiClient.put(`/projects/submissions/${submission.id}/grade`, {
                feedback: feedback || undefined,
                grade: grade !== '' ? g : undefined,
            });
            await showSuccessAlert('Saved', 'Evaluation saved successfully.');
            onSaved();
            onClose();
        } catch {
            showErrorAlert('Error', 'Failed to save evaluation.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-lg p-4 sm:p-6 my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-3 sm:mb-4 break-words">
                    Evaluation: {submission.student.firstName || submission.student.username}
                </h3>
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Repo URL
                        </label>
                        <a href={submission.repoUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-red-600 hover:underline flex items-center gap-1 break-all">
                            {submission.repoUrl} <ExternalLink className="w-3 h-3 shrink-0" />
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
                                        <span className="text-zinc-400">{new Date(c.date).toLocaleDateString('en-US')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Grade (0–10)
                        </label>
                        <Input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={grade}
                            onChange={e => setGrade(e.target.value)}
                            placeholder="Enter grade..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Feedback
                        </label>
                        <textarea
                            className="w-full h-28 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Comments for student..."
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto">Cancel</Button>
                        <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Evaluation
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
    const [editingRubricProjectId, setEditingRubricProjectId] = useState<number | null>(null);
    const [form, setForm] = useState<ProjectForm>({ title: '', description: '', requirements: '', deadline: '', enablePeerReview: false, peerReviewCount: 3 });

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
            await showSuccessAlert('Saved', 'Project saved successfully.');
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['teacher-projects', courseId] });
        },
        onError: () => showErrorAlert('Error', 'Failed to save project.'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-projects', courseId] });
        },
        onError: () => showErrorAlert('Error', 'Failed to delete project.'),
    });

    const handleDelete = async (project: Project) => {
        const result = await Swal.fire({
            title: 'Confirm Delete',
            text: `Are you sure you want to delete the project "${project.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancel',
            confirmButtonText: 'Delete',
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
            enablePeerReview: project.enablePeerReview ?? false,
            peerReviewCount: project.peerReviewCount ?? 3,
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingProject(null);
        setForm({ title: '', description: '', requirements: '', deadline: '', enablePeerReview: false, peerReviewCount: 3 });
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Github className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 shrink-0" />
                    Manage Projects
                </h1>
                <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    Add Project
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <Card className="p-4 sm:p-6 mb-5 sm:mb-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                        {editingProject ? 'Edit Project' : 'Create New Project'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project Name *</label>
                            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Project name..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description *</label>
                            <textarea
                                className="w-full h-24 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Project description..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Requirements *</label>
                            <textarea
                                className="w-full h-32 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-mono"
                                value={form.requirements}
                                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                                placeholder="List project requirements..."
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Deadline (optional)</label>
                                <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                            </div>
                            <div className="flex-1 flex flex-col justify-end">
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 py-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.enablePeerReview}
                                        onChange={e => setForm(f => ({ ...f, enablePeerReview: e.target.checked }))}
                                        className="rounded border-zinc-300 text-red-600 focus:ring-red-500 w-4 h-4"
                                    />
                                    Enable Peer Review
                                </label>
                            </div>
                        </div>
                        {form.enablePeerReview && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Required Peer Review Count</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={form.peerReviewCount}
                                    onChange={e => setForm(f => ({ ...f, peerReviewCount: Number(e.target.value) }))}
                                />
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <Button variant="outline" onClick={resetForm} disabled={saveMutation.isPending} className="w-full sm:w-auto">Cancel</Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending || !form.title || !form.description || !form.requirements}
                                className="bg-red-600 hover:bg-red-700 gap-2 w-full sm:w-auto"
                            >
                                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingProject ? 'Update' : 'Create Project'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Project list */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : (projects ?? []).length === 0 ? (
                <Card className="p-12 text-center text-zinc-500">No projects yet. Create the first project!</Card>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {(projects ?? []).map(project => (
                        <Card key={project.id} className="overflow-hidden">
                            <div className="p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-white break-words">{project.title}</h3>
                                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 break-words">{project.description}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400">
                                            <span>{project._count?.submissions ?? 0} submissions</span>
                                            {project.deadline && (
                                                <span>Deadline: {new Date(project.deadline).toLocaleDateString('en-US')}</span>
                                            )}
                                            {project.enablePeerReview && (
                                                <span className="text-yellow-600 dark:text-yellow-400 font-semibold bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">
                                                    Peer Review: {project.peerReviewCount} reviews
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                        {project.enablePeerReview && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingRubricProjectId(project.id)}
                                                className="gap-1 text-yellow-600 hover:text-yellow-700 border-yellow-200 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-900/20"
                                            >
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                Rubric
                                            </Button>
                                        )}
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
                                            Submissions
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {expandedProject === project.id && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 sm:p-5">
                                    {!submissions ? (
                                        <div className="text-center py-4 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                                    ) : submissions.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-4">No submissions yet</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {submissions.map(sub => {
                                                const name = [sub.student.firstName, sub.student.lastName].filter(Boolean).join(' ') || sub.student.username;
                                                return (
                                                    <div key={sub.id} className="flex flex-col gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg sm:flex-row sm:items-center">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 dark:text-white break-words">{name}</p>
                                                            <p className="text-xs text-zinc-500 break-all">{sub.student.email}</p>
                                                            <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline flex items-center gap-1 mt-1 break-all">
                                                                <Github className="w-3 h-3 shrink-0" />
                                                                {sub.repoUrl}
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 sm:flex-shrink-0">
                                                            <div className="sm:text-right">
                                                                {sub.grade !== null ? (
                                                                    <p className={`font-bold text-base sm:text-lg ${sub.grade >= 8 ? 'text-green-600' : sub.grade >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                        {sub.grade}/10
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-zinc-400">Not graded</p>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setGradingSubmission(sub)}
                                                                className="bg-red-600 hover:bg-red-700 gap-1 flex-shrink-0"
                                                            >
                                                                <Star className="w-3.5 h-3.5" />
                                                                Grade
                                                            </Button>
                                                        </div>
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

            {editingRubricProjectId && (
                <RubricModal
                    projectId={editingRubricProjectId}
                    onClose={() => setEditingRubricProjectId(null)}
                />
            )}
        </div>
    );
}
