import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, Loader2, Search, GraduationCap, Globe, Clock, User, FileText, BookOpen } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { showSuccessAlert, showErrorAlert } from '../../lib/sweetalert';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type TeacherApplication = {
    id: number;
    userId: number;
    bio: string;
    qualifications: string;
    cvUrl: string | null;
    topics: string;
    status: ApplicationStatus;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        username: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
    };
};

type TabFilter = 'ALL' | ApplicationStatus;

const STATUS_LABELS: Record<ApplicationStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
    const colors: Record<ApplicationStatus, string> = {
        PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    };
    return (
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

export default function ManageTeacherApplications() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<TabFilter>('PENDING');
    const [search, setSearch] = useState('');
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const { data: applications = [], isLoading } = useQuery<TeacherApplication[]>({
        queryKey: ['admin-teacher-applications', tab, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (tab !== 'ALL') params.set('status', tab);
            if (search.trim()) params.set('search', search.trim());
            const { data } = await apiClient.get(`/admin/teacher-applications?${params.toString()}`);
            return data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (applicationId: number) => {
            await apiClient.post(`/admin/teacher-applications/${applicationId}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teacher-applications'] });
            showSuccessAlert('Approved!', 'Instructor application has been approved. The user has been upgraded to TEACHER.');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not approve application.');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ applicationId, reason }: { applicationId: number; reason: string }) => {
            await apiClient.post(`/admin/teacher-applications/${applicationId}/reject`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teacher-applications'] });
            setRejectingId(null);
            setRejectReason('');
            showSuccessAlert('Rejected', 'Application has been rejected. The user will be notified.');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not reject application.');
        },
    });

    const handleReject = (applicationId: number) => {
        if (!rejectReason.trim()) {
            showErrorAlert('Missing Reason', 'Please enter a rejection reason.');
            return;
        }
        rejectMutation.mutate({ applicationId, reason: rejectReason.trim() });
    };

    const pendingCount = applications.filter((a) => a.status === 'PENDING').length;

    const tabs: { key: TabFilter; label: string }[] = [
        { key: 'PENDING', label: 'Pending' },
        { key: 'APPROVED', label: 'Approved' },
        { key: 'REJECTED', label: 'Rejected' },
        { key: 'ALL', label: 'All' },
    ];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-6xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin')}
                    className="mb-3 sm:mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Admin
                </Button>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                                Instructor Applications
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Manage instructor applications
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Search by name, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white dark:bg-zinc-800"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-4 sm:mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                tab === t.key
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                        >
                            {t.label}
                            {t.key === 'PENDING' && pendingCount > 0 && (
                                <span className="ml-2 inline-block rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : applications.length === 0 ? (
                    <Card className="p-12 text-center">
                        <GraduationCap className="h-12 w-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-zinc-500 dark:text-zinc-400">
                            No applications found {tab !== 'ALL' ? `(${STATUS_LABELS[tab as ApplicationStatus] || tab})` : ''}.
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {applications.map((app) => (
                            <Card key={app.id} className="overflow-hidden">
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                                    <User className="h-5 w-5 text-zinc-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                                            {app.user.firstName || ''} {app.user.lastName || ''}
                                                        </h3>
                                                        <StatusBadge status={app.status} />
                                                    </div>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                        @{app.user.username} • {app.user.email}
                                                    </p>
                                                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Submitted: {new Date(app.createdAt).toLocaleString('en-US')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quick info chips */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                                                    <BookOpen className="h-3 w-3" />
                                                    {app.topics}
                                                </span>
                                                {app.cvUrl && (
                                                    <a
                                                        href={app.cvUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                    >
                                                        <Globe className="h-3 w-3" />
                                                        CV/Portfolio
                                                    </a>
                                                )}
                                            </div>

                                            {/* Expandable details */}
                                            <button
                                                type="button"
                                                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                            >
                                                <FileText className="h-3 w-3" />
                                                {expandedId === app.id ? 'Hide details' : 'View profile details'}
                                            </button>

                                            {expandedId === app.id && (
                                                <div className="mt-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-3 border border-zinc-200 dark:border-zinc-700">
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Bio</p>
                                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{app.bio}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Qualifications / Experience</p>
                                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{app.qualifications}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rejection reason display */}
                                            {app.status === 'REJECTED' && app.rejectionReason && (
                                                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                                                    <strong>Rejection reason:</strong> {app.rejectionReason}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {app.status === 'PENDING' && (
                                            <div className="flex flex-col gap-2 lg:items-end shrink-0">
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Button
                                                        onClick={() => approveMutation.mutate(app.id)}
                                                        disabled={approveMutation.isPending && approveMutation.variables === app.id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                                                    >
                                                        {approveMutation.isPending && approveMutation.variables === app.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Check className="h-4 w-4 mr-2" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setRejectingId(rejectingId === app.id ? null : app.id);
                                                            setRejectReason('');
                                                        }}
                                                        variant="outline"
                                                        className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 w-full sm:w-auto"
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reject form */}
                                    {rejectingId === app.id && (
                                        <div className="mt-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                                            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                                Rejection Reason <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                rows={3}
                                                placeholder="Enter rejection reason..."
                                                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                            />
                                            <div className="mt-3 flex flex-col sm:flex-row sm:justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setRejectingId(null);
                                                        setRejectReason('');
                                                    }}
                                                    className="w-full sm:w-auto"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => handleReject(app.id)}
                                                    disabled={rejectMutation.isPending}
                                                    className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                                                >
                                                    {rejectMutation.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : null}
                                                    Confirm Reject
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
