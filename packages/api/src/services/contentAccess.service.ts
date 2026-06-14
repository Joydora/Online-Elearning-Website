import { prisma } from '../lib/prisma';

export type AccessDecision = {
    allowed: boolean;
    reason: 'FREE_PREVIEW' | 'ACTIVE_ENROLLMENT' | 'NOT_ENROLLED' | 'TRIAL_EXPIRED' | 'CONTENT_NOT_FOUND';
};

export async function canAccessContent(
    userId: number | null,
    contentId: number,
): Promise<AccessDecision> {
    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            id: true,
            isFreePreview: true,
            module: {
                select: { courseId: true },
            },
        },
    });

    if (!content) {
        return { allowed: false, reason: 'CONTENT_NOT_FOUND' };
    }

    if (content.isFreePreview) {
        return { allowed: true, reason: 'FREE_PREVIEW' };
    }

    if (userId === null) {
        return { allowed: false, reason: 'NOT_ENROLLED' };
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: {
            studentId_courseId: {
                studentId: userId,
                courseId: content.module.courseId,
            },
        },
        select: { id: true, type: true, expiresAt: true, isActive: true },
    });

    if (!enrollment) {
        return { allowed: false, reason: 'NOT_ENROLLED' };
    }

    // Belt-and-suspenders: block if either the flag is off (cron swept it)
    // or expiresAt has passed (cron hasn't run yet).
    if (!enrollment.isActive) {
        return { allowed: false, reason: 'TRIAL_EXPIRED' };
    }

    if (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now()) {
        return { allowed: false, reason: 'TRIAL_EXPIRED' };
    }

    return { allowed: true, reason: 'ACTIVE_ENROLLMENT' };
}

export async function getContentWithAccess(userId: number | null, contentId: number) {
    const decision = await canAccessContent(userId, contentId);

    if (!decision.allowed) {
        return { decision, content: null };
    }

    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
            id: true,
            title: true,
            order: true,
            contentType: true,
            videoUrl: true,
            documentUrl: true,
            durationInSeconds: true,
            timeLimitInMinutes: true,
            isFreePreview: true,
            fileType: true,
            moduleId: true,
        },
    });

    return { decision, content };
}
