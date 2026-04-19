import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CommentNode = {
    id: number;
    text: string;
    parentId: number | null;
    author: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
    };
    createdAt: Date;
    replies: CommentNode[];
};

type CommentCreateInput = {
    contentId: number;
    userId: number;
    text: string;
    parentId?: number | null;
};

export async function getComments(contentId: number): Promise<CommentNode[]> {
    const comments = await prisma.comment.findMany({
        where: { contentId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            text: true,
            parentId: true,
            contentId: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    const nodes = comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        parentId: comment.parentId,
        author: comment.author,
        createdAt: comment.createdAt,
        replies: [] as CommentNode[],
    }));

    const nodeById = new Map<number, CommentNode>();
    nodes.forEach((node) => {
        nodeById.set(node.id, node);
    });

    const roots: CommentNode[] = [];

    nodes.forEach((node) => {
        if (node.parentId === null) {
            roots.push(node);
            return;
        }

        const parent = nodeById.get(node.parentId);

        if (parent) {
            parent.replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export async function postComment({ contentId, userId, text, parentId }: CommentCreateInput) {
    if (!text || !text.trim()) {
        throw new Error('COMMENT_TEXT_REQUIRED');
    }

    const enrollment = await prisma.enrollment.findFirst({
        where: {
            studentId: userId,
            course: {
                modules: {
                    some: {
                        contents: {
                            some: { id: contentId },
                        },
                    },
                },
            },
        },
        select: { id: true, isActive: true, expiresAt: true },
    });

    if (!enrollment) {
        throw new Error('ENROLLMENT_REQUIRED');
    }

    if (!enrollment.isActive || (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now())) {
        throw new Error('ENROLLMENT_EXPIRED');
    }

    const newComment = await prisma.comment.create({
        data: {
            text,
            parentId: parentId ?? null,
            contentId,
            authorId: userId,
        },
        select: {
            id: true,
            text: true,
            parentId: true,
            contentId: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    return {
        ...newComment,
        replies: [] as CommentNode[],
    };
}
