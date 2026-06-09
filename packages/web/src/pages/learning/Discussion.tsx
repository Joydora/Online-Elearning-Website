import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Reply, Send } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { showErrorAlert } from '../../lib/sweetalert';

type DiscussionNode = {
    id: number;
    text: string;
    parentId: number | null;
    createdAt: string;
    author: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    };
    replies: DiscussionNode[];
};

type CourseDetailResponse = {
    id: number;
    title: string;
};

function displayName(author: DiscussionNode['author']): string {
    const fullName = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim();
    return fullName || author.username;
}

function roleBadge(role: DiscussionNode['author']['role']): string {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'TEACHER') return 'Teacher';
    return 'Student';
}

function Thread({
    node,
    level = 0,
    onReply,
}: {
    node: DiscussionNode;
    level?: number;
    onReply: (id: number) => void;
}) {
    return (
        <div className={`${level > 0 ? 'ml-4 sm:ml-8 border-l border-zinc-200 dark:border-zinc-700 pl-3 sm:pl-4' : ''} mt-3`}>
            <Card className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                            {displayName(node.author)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {roleBadge(node.author.role)} - {new Date(node.createdAt).toLocaleString('en-US')}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReply(node.id)}
                        className="text-xs sm:text-sm h-8 px-2 sm:px-3"
                    >
                        <Reply className="h-3.5 w-3.5 mr-1" />
                        Reply
                    </Button>
                </div>
                <p className="mt-2 text-sm sm:text-base whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                    {node.text}
                </p>
            </Card>
            {node.replies.map((reply) => (
                <Thread key={reply.id} node={reply} level={level + 1} onReply={onReply} />
            ))}
        </div>
    );
}

export default function Discussion() {
    const { courseId } = useParams<{ courseId: string }>();
    const queryClient = useQueryClient();
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<number | null>(null);

    const { data: course } = useQuery<CourseDetailResponse>({
        queryKey: ['course-basic', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get<CourseDetailResponse>(`/courses/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    const { data: threads = [], isLoading } = useQuery<DiscussionNode[]>({
        queryKey: ['course-discussions', courseId],
        queryFn: async () => {
            const { data } = await apiClient.get<DiscussionNode[]>(`/discussions/courses/${courseId}`);
            return data;
        },
        enabled: !!courseId,
    });

    const replyingToName = useMemo(() => {
        if (!replyTo) return null;
        const stack = [...threads];
        while (stack.length > 0) {
            const current = stack.shift()!;
            if (current.id === replyTo) return displayName(current.author);
            stack.push(...current.replies);
        }
        return null;
    }, [replyTo, threads]);

    const createMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post(`/discussions/courses/${courseId}`, {
                text,
                parentId: replyTo,
            });
        },
        onSuccess: () => {
            setText('');
            setReplyTo(null);
            queryClient.invalidateQueries({ queryKey: ['course-discussions', courseId] });
        },
        onError: (error: any) => {
            showErrorAlert(error?.response?.data?.error || 'Could not send comment');
        },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!text.trim()) return;
        createMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-4 sm:py-6">
            <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                            Course Discussion
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                            {course?.title ?? `Course #${courseId}`}
                        </p>
                    </div>
                    <Link to={`/courses/${courseId}`}>
                        <Button variant="outline" className="w-full sm:w-auto">View Course</Button>
                    </Link>
                </div>

                <Card className="p-3 sm:p-4 mb-4 sm:mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {replyTo && (
                            <div className="flex items-center justify-between rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs sm:text-sm">
                                <span>Replying to: <strong>{replyingToName ?? `#${replyTo}`}</strong></span>
                                <button
                                    type="button"
                                    className="text-red-500"
                                    onClick={() => setReplyTo(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Write your comment or question..."
                            rows={4}
                            className="text-sm sm:text-base"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                                disabled={createMutation.isPending || !text.trim()}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {createMutation.isPending ? 'Sending...' : 'Post Comment'}
                            </Button>
                        </div>
                    </form>
                </Card>

                <div className="space-y-3">
                    {isLoading ? (
                        <Card className="p-4 text-sm text-zinc-500">Loading discussions...</Card>
                    ) : threads.length === 0 ? (
                        <Card className="p-4 text-sm sm:text-base text-zinc-500">
                            No discussions yet. Be the first to start a conversation!
                        </Card>
                    ) : (
                        threads.map((thread) => (
                            <Thread key={thread.id} node={thread} onReply={setReplyTo} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
