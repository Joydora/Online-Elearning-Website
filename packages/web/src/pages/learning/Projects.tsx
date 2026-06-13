import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Github, Send, RefreshCw, Clock, CheckCircle, Loader2, ChevronDown, ChevronUp, ExternalLink, Lock, Unlock, Award, Star, MessageSquare } from 'lucide-react';
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
    enablePeerReview?: boolean;
    peerReviewCount?: number;
};

type RubricItem = {
    id: number;
    criteria: string;
    description: string;
    maxScore: number;
};

function SelfAssessmentForm({ submissionId, rubrics, onSaved, existingAssessment }: {
    submissionId: number;
    rubrics: RubricItem[];
    onSaved: () => void;
    existingAssessment?: any;
}) {
    const [scores, setScores] = useState<Record<number, number>>({});
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (existingAssessment) {
            setFeedback(existingAssessment.feedback || '');
            const initialScores: Record<number, number> = {};
            existingAssessment.scores?.forEach((s: any) => {
                initialScores[s.rubricItemId] = s.score;
            });
            setScores(initialScores);
        } else {
            const initialScores: Record<number, number> = {};
            rubrics.forEach(r => {
                initialScores[r.id] = r.maxScore;
            });
            setScores(initialScores);
        }
    }, [existingAssessment, rubrics]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const scoresPayload = Object.entries(scores).map(([rubricItemId, score]) => ({
                rubricItemId: Number(rubricItemId),
                score
            }));
            await apiClient.post(`/projects/submissions/${submissionId}/self-assessment`, {
                feedback,
                scores: scoresPayload
            });
            await showSuccessAlert('Self-Assessment Submitted', 'Your self-evaluation has been saved.');
            onSaved();
        } catch {
            showErrorAlert('Error', 'Failed to submit self-assessment.');
        } finally {
            setSubmitting(false);
        }
    };

    const isReadOnly = !!existingAssessment;

    return (
        <div className="mt-4 p-4 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl space-y-3 text-left">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-red-600" />
                Self-Assessment
            </h4>
            <p className="text-xs text-zinc-500">
                Please evaluate the completeness of your submission based on the criteria below:
            </p>
            <div className="space-y-3">
                {rubrics.map(rubric => (
                    <div key={rubric.id} className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <div>
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{rubric.criteria}</span>
                                <p className="text-[11px] text-zinc-400 mt-0.5">{rubric.description}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {isReadOnly ? (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                                        {scores[rubric.id] || 0} / {rubric.maxScore}
                                    </span>
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            min={0}
                                            max={rubric.maxScore}
                                            step={0.5}
                                            className="w-14 px-1.5 py-1 text-xs border rounded bg-zinc-50 dark:bg-zinc-900 text-right font-medium"
                                            value={scores[rubric.id] ?? rubric.maxScore}
                                            onChange={e => setScores({ ...scores, [rubric.id]: Number(e.target.value) })}
                                        />
                                        <span className="text-xs text-zinc-400">/ {rubric.maxScore}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Self-Evaluation Notes</label>
                    <textarea
                        className="w-full h-16 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="State which areas you completed well or struggled with..."
                        disabled={isReadOnly}
                    />
                </div>
                {!isReadOnly && (
                    <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-red-600 hover:bg-red-700 w-full text-xs py-2">
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Submit Self-Assessment
                    </Button>
                )}
            </div>
        </div>
    );
}

function PeerReviewModal({ assignmentId, onClose, onSaved }: {
    assignmentId: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [assignment, setAssignment] = useState<any>(null);
    const [scores, setScores] = useState<Record<number, number>>({});
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const { data } = await apiClient.get(`/projects/peer-reviews/${assignmentId}`);
                setAssignment(data);
                const initialScores: Record<number, number> = {};
                data.submission.project.rubrics.forEach((r: any) => {
                    initialScores[r.id] = r.maxScore;
                });
                setScores(initialScores);
            } catch {
                showErrorAlert('Error', 'Failed to load assignment details');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [assignmentId, onClose]);

    const handleSubmit = async () => {
        const rubrics = assignment.submission.project.rubrics;
        if (rubrics.some((r: any) => scores[r.id] === undefined || scores[r.id] < 0 || scores[r.id] > r.maxScore)) {
            showErrorAlert('Error', 'Please enter valid scores for all criteria.');
            return;
        }
        setSubmitting(true);
        try {
            const scoresPayload = Object.entries(scores).map(([rubricItemId, score]) => ({
                rubricItemId: Number(rubricItemId),
                score
            }));
            await apiClient.post(`/projects/peer-reviews/${assignmentId}/submit`, {
                feedback,
                scores: scoresPayload
            });
            await showSuccessAlert('Review Submitted', 'Thank you for reviewing your peer!');
            onSaved();
            onClose();
        } catch {
            showErrorAlert('Error', 'Failed to submit peer review.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
                <Card className="w-full max-w-lg p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-600" />
                </Card>
            </div>
        );
    }

    const project = assignment.submission.project;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto text-left">
            <Card className="w-full max-w-2xl p-4 sm:p-6 my-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-2">
                    Review Classmate's Submission
                </h3>
                <div className="space-y-4">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-1">
                        <span className="text-xs font-semibold text-zinc-500">Repository URL:</span>
                        <a href={assignment.submission.repoUrl} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-red-600 hover:underline flex items-center gap-1 break-all">
                            {assignment.submission.repoUrl} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                    </div>

                    {assignment.submission.commitHistory?.length > 0 && (
                        <div>
                            <span className="text-xs font-semibold text-zinc-500 mb-1 block">Commit History (Latest 5):</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto border rounded p-1.5 bg-zinc-50/50">
                                {assignment.submission.commitHistory.slice(0, 5).map((c: any) => (
                                    <div key={c.sha} className="flex gap-1 text-[11px] font-mono">
                                        <code className="text-red-500">{c.sha}</code>
                                        <span className="truncate flex-1 text-zinc-600">{c.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Rubric Items (Grading Criteria):</span>
                        {project.rubrics.map((rubric: any) => (
                            <div key={rubric.id} className="p-3 bg-zinc-50/50 rounded-lg border border-zinc-150">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <div>
                                        <span className="text-xs font-semibold text-zinc-800">{rubric.criteria}</span>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">{rubric.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input
                                            type="number"
                                            min={0}
                                            max={rubric.maxScore}
                                            step={0.5}
                                            className="w-14 px-1.5 py-1 text-xs border rounded bg-zinc-50 dark:bg-zinc-900 text-right font-medium"
                                            value={scores[rubric.id] ?? rubric.maxScore}
                                            onChange={e => setScores({ ...scores, [rubric.id]: Number(e.target.value) })}
                                        />
                                        <span className="text-xs text-zinc-400">/ {rubric.maxScore}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Constructive Feedback & Comments:</label>
                        <textarea
                            className="w-full h-24 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Write constructive feedback, highlighting strengths and areas for improvement..."
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end border-t pt-4">
                        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="bg-red-600 hover:bg-red-700 gap-1">
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Submit Evaluation
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function ProjectCard({ project, courseId }: { project: Project; courseId: string }) {
    const queryClient = useQueryClient();
    const [repoUrl, setRepoUrl] = useState(project.submission?.repoUrl || '');
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'feedback' | 'peer-tasks'>('feedback');
    const [activeReviewId, setActiveReviewId] = useState<number | null>(null);

    const { data: rubrics } = useQuery<RubricItem[]>({
        queryKey: ['project-rubric', project.id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/${project.id}/rubric`);
            return data;
        },
        enabled: !!project.enablePeerReview
    });

    const { data: assignments, refetch: refetchAssignments } = useQuery({
        queryKey: ['assigned-reviews', project.id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/${project.id}/peer-reviews/assigned`);
            return data;
        },
        enabled: !!project.submission && !!project.enablePeerReview
    });

    const { data: reviewsData, error: reviewsError, refetch: refetchReviews } = useQuery({
        queryKey: ['reviews-received', project.submission?.id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/projects/submissions/${project.submission!.id}/reviews`);
            return data;
        },
        enabled: !!project.submission,
        retry: false
    });

    const isReviewsLocked = reviewsError && (reviewsError as any).response?.status === 403 && (reviewsError as any).response?.data?.error === 'COMPULSORY_REVIEWS_NOT_COMPLETED';

    const submitMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/projects/${project.id}/submit`, { repoUrl });
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert('Submission successful!', 'Your submission has been recorded.');
            queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
        },
        onError: (e: any) => showErrorAlert('Error', e.response?.data?.error || 'Failed to submit.'),
    });

    const refreshMutation = useMutation({
        mutationFn: async () => {
            if (!project.submission) return;
            const { data } = await apiClient.post(`/projects/submissions/${project.submission.id}/refresh-commits`);
            return data;
        },
        onSuccess: async () => {
            await showSuccessAlert('Updated successfully!', 'Commit list has been refreshed.');
            queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
        },
        onError: (e: any) => showErrorAlert('Error', e.response?.data?.error || 'Failed to refresh commits.'),
    });

    const isPastDeadline = project.deadline && new Date(project.deadline) < new Date();

    return (
        <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white break-words">{project.title}</h3>
                        {project.enablePeerReview && (
                            <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                                Peer Review
                            </span>
                        )}
                    </div>
                    {project.deadline && (
                        <div className={`flex items-start gap-1 text-xs sm:text-sm mt-1 ${isPastDeadline ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                Deadline: {new Date(project.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {isPastDeadline && ' (Expired)'}
                            </span>
                        </div>
                    )}
                </div>
                {project.submission?.grade !== null && project.submission?.grade !== undefined && (
                    <div className="text-right flex-shrink-0">
                        <p className={`text-xl sm:text-2xl font-bold ${project.submission.grade >= 8 ? 'text-green-600' : project.submission.grade >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {project.submission.grade}/10
                        </p>
                        <p className="text-xs text-zinc-500">Score</p>
                    </div>
                )}
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{project.description}</p>

            <button
                className="text-sm text-red-600 hover:underline flex items-center gap-1 mb-4"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Hide requirements' : 'View detailed requirements'}
            </button>

            {expanded && (
                <pre className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 whitespace-pre-wrap mb-4 border border-zinc-200 dark:border-zinc-700 text-left font-mono">
                    {project.requirements}
                </pre>
            )}

            {/* Feedback for standard projects (no peer review) */}
            {!project.enablePeerReview && project.submission?.feedback && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Instructor's feedback:</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{project.submission.feedback}</p>
                </div>
            )}

            {/* Submit form */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
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
                        className="bg-red-600 hover:bg-red-700 gap-1 sm:shrink-0"
                    >
                        {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {project.submission ? 'Update' : 'Submit'}
                    </Button>
                </div>

                {project.submission && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 break-words">
                                Submitted at {new Date(project.submission.submittedAt).toLocaleString('en-US')}
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => refreshMutation.mutate()}
                            disabled={refreshMutation.isPending}
                            className="sm:ml-auto gap-1 text-xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                            Refresh commits
                        </Button>
                    </div>
                )}
            </div>

            {/* Commit history */}
            {project.submission?.commitHistory && project.submission.commitHistory.length > 0 && (
                <div className="mt-4 border-b border-zinc-150 pb-4">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1 text-left">
                        <Github className="w-4 h-4" />
                        Commit history ({project.submission.commitHistory.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {project.submission.commitHistory.map((c) => (
                            <div key={c.sha} className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-3 py-2 text-left">
                                <code className="text-red-600 font-mono">{c.sha}</code>
                                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">{c.message}</span>
                                <span className="text-zinc-400 flex-shrink-0">{new Date(c.date).toLocaleDateString('en-US')}</span>
                                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600">
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Peer Review Panels & Tabs */}
            {project.submission && project.enablePeerReview && (
                <div className="mt-5 space-y-4">
                    <div className="flex border-b border-zinc-200">
                        <button
                            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${activeTab === 'feedback' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                            onClick={() => setActiveTab('feedback')}
                        >
                            My Feedback & Rubric
                        </button>
                        <button
                            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all ${activeTab === 'peer-tasks' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                            onClick={() => setActiveTab('peer-tasks')}
                        >
                            Peer Review Tasks ({(assignments || []).length})
                        </button>
                    </div>

                    {activeTab === 'feedback' && (
                        <div className="space-y-4">
                            {/* Self Assessment Form */}
                            {rubrics && rubrics.length > 0 && (
                                <SelfAssessmentForm
                                    submissionId={project.submission.id}
                                    rubrics={rubrics}
                                    existingAssessment={reviewsData?.selfAssessment}
                                    onSaved={() => {
                                        refetchReviews();
                                        queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
                                    }}
                                />
                            )}

                            {/* Instructor's Feedback (Show here if Peer Review is enabled and reviews are unlocked) */}
                            {!isReviewsLocked && reviewsData?.feedback && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 text-left mb-2">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-current text-yellow-500" /> Instructor's Feedback:
                                    </p>
                                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{reviewsData.feedback}</p>
                                </div>
                            )}

                            {/* Peer Reviews received */}
                            <div className="text-left space-y-3">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    <MessageSquare className="w-4.5 h-4.5 text-red-600" />
                                    Peer Feedback Received
                                </h4>

                                {isReviewsLocked ? (
                                    <div className="p-5 border border-yellow-200 bg-yellow-50/30 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                                        <Lock className="w-8 h-8 text-yellow-600 animate-pulse" />
                                        <div>
                                            <h5 className="text-sm font-bold text-yellow-800">Reviews & Scores are Locked!</h5>
                                            <p className="text-xs text-yellow-700 mt-1 max-w-md">
                                                You must complete all assigned peer reviews in the **Peer Review Tasks** tab to unlock your own grades and feedback.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {reviewsData?.peerReviews && reviewsData.peerReviews.length > 0 ? (
                                            reviewsData.peerReviews.map((review: any, idx: number) => (
                                                <div key={review.id} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                                                    <div className="flex justify-between items-center border-b pb-1.5 border-zinc-200/50">
                                                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Anonymous Peer #{idx + 1}</span>
                                                        <span className="text-xs text-zinc-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {review.scores && review.scores.length > 0 && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
                                                            {review.scores.map((s: any) => {
                                                                const rubItem = rubrics?.find(r => r.id === s.rubricItemId);
                                                                return (
                                                                    <div key={s.id} className="text-[11px] bg-white dark:bg-zinc-900 border px-2 py-1 rounded">
                                                                        <span className="font-medium text-zinc-500 truncate block">{rubItem?.criteria || 'Criteria'}</span>
                                                                        <span className="font-bold text-red-600">{s.score} / {rubItem?.maxScore || 10}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {review.feedback && (
                                                        <p className="text-xs text-zinc-700 dark:text-zinc-300 italic bg-white dark:bg-zinc-900/50 p-2.5 rounded border border-dashed">
                                                            "{review.feedback}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-zinc-500 italic">No peer reviews received yet. Check back later!</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'peer-tasks' && (
                        <div className="text-left space-y-3">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <Award className="w-4.5 h-4.5 text-red-600" />
                                Assigned Review Tasks
                            </h4>
                            <p className="text-xs text-zinc-500">
                                Complete peer evaluations to help your classmates improve.
                            </p>
                            <div className="space-y-3">
                                {assignments && assignments.length > 0 ? (
                                    assignments.map((assignment: any) => {
                                        const isCompleted = assignment.status === 'COMPLETED';
                                        return (
                                            <div key={assignment.id} className="p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Classmate Submission</span>
                                                    <div className="text-xs font-semibold truncate max-w-sm sm:max-w-md text-zinc-700">
                                                        {assignment.submission.repoUrl}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                                    {isCompleted ? (
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded border border-green-200 w-full sm:w-auto text-center">
                                                            ✓ Completed
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setActiveReviewId(assignment.id)}
                                                            className="bg-red-600 hover:bg-red-700 text-xs w-full sm:w-auto"
                                                        >
                                                            Start Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-zinc-500 italic">No peer assignments yet. They will appear here when more peers submit.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeReviewId && (
                <PeerReviewModal
                    assignmentId={activeReviewId}
                    onClose={() => setActiveReviewId(null)}
                    onSaved={() => {
                        refetchAssignments();
                        refetchReviews();
                        queryClient.invalidateQueries({ queryKey: ['student-projects', courseId] });
                    }}
                />
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
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 flex items-center gap-2">
                <Github className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                Real-world Projects
            </h1>

            {!projects || projects.length === 0 ? (
                <Card className="p-8 sm:p-12 text-center text-zinc-500 dark:text-zinc-400">
                    No projects have been assigned to this course yet.
                </Card>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {projects.map(p => <ProjectCard key={p.id} project={p} courseId={courseId!} />)}
                </div>
            )}
        </div>
    );
}
