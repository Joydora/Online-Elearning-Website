import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Pagination } from '../../components/ui/Pagination';

type AuditRow = {
    id: number;
    action: string;
    resource: string;
    resourceId: string | null;
    description: string | null;
    createdAt: string;
    admin: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
    } | null;
};

type AuditResponse = {
    rows: AuditRow[];
    total: number;
    page: number;
    totalPages: number;
};

export default function AdminAuditLogs() {
    const navigate = useNavigate();
    const [resource, setResource] = useState('');
    const [action, setAction] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<AuditResponse>({
        queryKey: ['admin-audit-logs', resource, action, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (resource) params.set('resource', resource);
            if (action) params.set('action', action);
            params.set('page', String(page));
            params.set('limit', '20');
            const { data } = await apiClient.get(`/admin/audit-logs?${params.toString()}`);
            return data;
        },
    });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-7xl">
                <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-3 sm:mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="h-7 w-7 text-indigo-600" />
                        Admin Audit Logs
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Administrator action history: user, course, promotion, payout.
                    </p>
                </div>

                <Card className="p-4 sm:p-6 mb-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <select
                            value={resource}
                            onChange={(e) => {
                                setResource(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                        >
                            <option value="">All Resources</option>
                            <option value="USER">USER</option>
                            <option value="COURSE">COURSE</option>
                            <option value="PROMOTION">PROMOTION</option>
                            <option value="PAYOUT">PAYOUT</option>
                        </select>

                        <select
                            value={action}
                            onChange={(e) => {
                                setAction(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">CREATE</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                </Card>

                <Card className="p-4 sm:p-6">
                    {isLoading ? (
                        <p className="text-zinc-600 dark:text-zinc-400">Loading audit logs...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                        <th className="text-left py-2 px-3">Timestamp</th>
                                        <th className="text-left py-2 px-3">Admin</th>
                                        <th className="text-left py-2 px-3">Action</th>
                                        <th className="text-left py-2 px-3">Resource</th>
                                        <th className="text-left py-2 px-3">Resource ID</th>
                                        <th className="text-left py-2 px-3">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data?.rows ?? []).map((row) => {
                                        const adminName =
                                            [row.admin?.firstName, row.admin?.lastName].filter(Boolean).join(' ') ||
                                            row.admin?.username ||
                                            'N/A';
                                        return (
                                            <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                                                <td className="py-2 px-3">{new Date(row.createdAt).toLocaleString('en-US')}</td>
                                                <td className="py-2 px-3">{adminName}</td>
                                                <td className="py-2 px-3">{row.action}</td>
                                                <td className="py-2 px-3">{row.resource}</td>
                                                <td className="py-2 px-3">{row.resourceId ?? '-'}</td>
                                                <td className="py-2 px-3">{row.description ?? '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {data && data.totalPages > 1 && (
                        <Pagination
                            currentPage={data.page}
                            totalPages={data.totalPages}
                            onPageChange={setPage}
                        />
                    )}
                </Card>
            </div>
        </div>
    );
}

