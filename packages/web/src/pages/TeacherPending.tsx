import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Clock, CheckCircle, XCircle, GraduationCap, FileText, Globe, BookOpen, Send, Loader2, LogOut } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { useAuthStore } from '../stores/useAuthStore';
import { showSuccessAlert, showErrorAlert } from '../lib/sweetalert';

type ApplicationData = {
    id: number;
    userId: number;
    bio: string;
    qualifications: string;
    cvUrl: string | null;
    topics: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export default function TeacherPending() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const clearUser = useAuthStore((s) => s.clearUser);
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState('');
    const [qualifications, setQualifications] = useState('');
    const [cvUrl, setCvUrl] = useState('');
    const [topics, setTopics] = useState('');

    const { data: application, isLoading } = useQuery<ApplicationData>({
        queryKey: ['my-teacher-application'],
        queryFn: async () => {
            const { data } = await apiClient.get('/teacher-applications/my');
            return data;
        },
    });

    const resubmitMutation = useMutation({
        mutationFn: async (values: { bio: string; qualifications: string; cvUrl: string; topics: string }) => {
            const { data } = await apiClient.post('/teacher-applications', values);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-teacher-application'] });
            setEditing(false);
            showSuccessAlert('Resubmitted!', 'Application has been resubmitted for Admin review.');
        },
        onError: (error: any) => {
            showErrorAlert('Error', error.response?.data?.error || 'Could not resubmit application.');
        },
    });

    const handleLogout = () => {
        clearUser();
        navigate('/login');
    };

    const handleStartEdit = () => {
        if (application) {
            setBio(application.bio);
            setQualifications(application.qualifications);
            setCvUrl(application.cvUrl || '');
            setTopics(application.topics);
        }
        setEditing(true);
    };

    const handleResubmit = () => {
        resubmitMutation.mutate({ bio, qualifications, cvUrl, topics });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    const statusConfig = {
        PENDING: {
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            border: 'border-amber-200 dark:border-amber-800',
            label: 'Pending Review',
            description: 'Your teaching application is being reviewed by the Admin. This process may take 1-3 business days.',
        },
        APPROVED: {
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            border: 'border-emerald-200 dark:border-emerald-800',
            label: 'Approved',
            description: 'Congratulations! Your profile has been approved. You can start creating courses.',
        },
        REJECTED: {
            icon: XCircle,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-100 dark:bg-red-900/30',
            border: 'border-red-200 dark:border-red-800',
            label: 'Rejected',
            description: 'Your profile did not meet the requirements. Please see the reason below and resubmit.',
        },
    };

    const status = application?.status || 'PENDING';
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                            <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Instructor Application
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Your application status
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>

                {/* Status Banner */}
                <Card className={`p-6 mb-6 border-2 ${config.border}`}>
                    <div className="flex items-start gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${config.bg} shrink-0`}>
                            <StatusIcon className={`h-7 w-7 ${config.color}`} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${config.color}`}>
                                {config.label}
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                {config.description}
                            </p>
                            {application?.updatedAt && (
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                                    Last updated: {new Date(application.updatedAt).toLocaleString('en-US')}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Rejection Reason */}
                {status === 'REJECTED' && application?.rejectionReason && (
                    <Card className="p-5 mb-6 border border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
                        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Rejection Reason
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            {application.rejectionReason}
                        </p>
                    </Card>
                )}

                {/* Application Details */}
                <Card className="p-6 mb-6">
                    {editing ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                Edit Application
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Bio / Introduction <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={4}
                                    placeholder="Short bio about yourself... (minimum 30 characters)"
                                    className="bg-white dark:bg-zinc-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Qualifications / Experience <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={qualifications}
                                    onChange={(e) => setQualifications(e.target.value)}
                                    rows={4}
                                    placeholder="List your qualifications, certificates... (minimum 20 characters)"
                                    className="bg-white dark:bg-zinc-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    CV / Portfolio URL <span className="text-zinc-400 text-xs">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        value={cvUrl}
                                        onChange={(e) => setCvUrl(e.target.value)}
                                        placeholder="https://linkedin.com/in/your-profile"
                                        className="pl-10 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Teaching Fields <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        value={topics}
                                        onChange={(e) => setTopics(e.target.value)}
                                        placeholder="e.g. Web Development, Machine Learning..."
                                        className="pl-10 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setEditing(false)}
                                    disabled={resubmitMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleResubmit}
                                    disabled={resubmitMutation.isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                >
                                    {resubmitMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Resubmit Application
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                Submitted Information
                            </h3>
                            {application ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                            Bio
                                        </p>
                                        <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                                            {application.bio}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                            Qualifications / Experience
                                        </p>
                                        <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                                            {application.qualifications}
                                        </p>
                                    </div>
                                    {application.cvUrl && (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                                CV / Portfolio
                                            </p>
                                            <a
                                                href={application.cvUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                            >
                                                <Globe className="h-3.5 w-3.5" />
                                                {application.cvUrl}
                                            </a>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                            Teaching Fields
                                        </p>
                                        <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                                            {application.topics}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                            Submission Date
                                        </p>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {new Date(application.createdAt).toLocaleString('en-US')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500">No application found.</p>
                            )}

                            {status === 'REJECTED' && (
                                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                    <Button
                                        onClick={handleStartEdit}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Edit and Resubmit
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                        Application Review Process
                    </h3>
                    <div className="space-y-4">
                        {[
                            { step: 1, label: 'Submit Application', desc: 'You have submitted your application', done: true },
                            { step: 2, label: 'Admin Review', desc: 'Your application is being reviewed', done: status === 'APPROVED' },
                            { step: 3, label: 'Result', desc: status === 'APPROVED' ? 'Approved - You can now create courses!' : status === 'REJECTED' ? 'Rejected - Please edit and resubmit' : 'Waiting for results...', done: status === 'APPROVED' },
                        ].map((item, idx) => (
                            <div key={item.step} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                        item.done
                                            ? 'bg-emerald-600 text-white'
                                            : status === 'REJECTED' && idx === 2
                                                ? 'bg-red-600 text-white'
                                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        {item.step}
                                    </div>
                                    {idx < 2 && (
                                        <div className={`w-0.5 h-8 ${
                                            item.done ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-zinc-200 dark:bg-zinc-700'
                                        }`}></div>
                                    )}
                                </div>
                                <div className="pt-1">
                                    <p className={`text-sm font-semibold ${
                                        item.done
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : status === 'REJECTED' && idx === 2
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
