import { NotificationType, PrismaClient, Role } from '@prisma/client';
import { createNotification } from './notification.service';

const prisma = new PrismaClient();

type DiscussionNode = {
    id: number;
    text: string;
    parentId: number | null;
    author: {
        id: number;
        username: string;
        firstName: string | null;
        lastName: string | null;
        role: Role;
    };
    createdAt: Date;
    replies: DiscussionNode[];
};

type DiscussionCreateInput = {
    courseId: number;
    userId: number;
    userRole: Role;
    text: string;
    parentId?: number | null;
};

async function canParticipate(courseId: number, userId: number, role: Role): Promise<boolean> {
    if (role === Role.ADMIN) {
        return true;
    }

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true },
    });

    if (!course) {
        throw new Error('COURSE_NOT_FOUND');
    }

    if (course.teacherId === userId) {
        return true;
    }

    const enrollment = await prisma.enrollment.findFirst({
        where: {
            courseId,
            studentId: userId,
            isActive: true,
        },
        select: { id: true },
    });

    return !!enrollment;
}

export async function getCourseDiscussion(courseId: number): Promise<DiscussionNode[]> {
    const posts = await prisma.discussionPost.findMany({
        where: { courseId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            text: true,
            parentId: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
        },
    });

    const nodes = posts.map((post) => ({
        id: post.id,
        text: post.text,
        parentId: post.parentId,
        author: post.author,
        createdAt: post.createdAt,
        replies: [] as DiscussionNode[],
    }));

    const nodeById = new Map<number, DiscussionNode>();
    nodes.forEach((node) => nodeById.set(node.id, node));

    const roots: DiscussionNode[] = [];
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

export async function createDiscussionPost({ courseId, userId, userRole, text, parentId }: DiscussionCreateInput) {
    if (!text || !text.trim()) {
        throw new Error('DISCUSSION_TEXT_REQUIRED');
    }

    const allowed = await canParticipate(courseId, userId, userRole);
    if (!allowed) {
        throw new Error('DISCUSSION_ACCESS_DENIED');
    }

    let parentAuthorId: number | null = null;
    if (parentId) {
        const parent = await prisma.discussionPost.findUnique({
            where: { id: parentId },
            select: { id: true, courseId: true, authorId: true },
        });
        if (!parent || parent.courseId !== courseId) {
            throw new Error('INVALID_PARENT_POST');
        }
        parentAuthorId = parent.authorId;
    }

    const post = await prisma.discussionPost.create({
        data: {
            text: text.trim(),
            courseId,
            authorId: userId,
            parentId: parentId ?? null,
        },
        select: {
            id: true,
            text: true,
            parentId: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                },
            },
        },
    });

    if (parentAuthorId && parentAuthorId !== userId) {
        await createNotification({
            userId: parentAuthorId,
            type: NotificationType.DISCUSSION_REPLY,
            title: 'Ban co phan hoi moi trong thao luan',
            message: `Co nguoi vua phan hoi bai viet cua ban trong khoa hoc.`,
            link: `/courses/${courseId}/discussions`,
            sendEmail: true,
        });
    }

    return { ...post, replies: [] as DiscussionNode[] };
}
