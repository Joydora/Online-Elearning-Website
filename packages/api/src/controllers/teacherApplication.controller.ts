import { Request, Response } from 'express';
import { PrismaClient, Role, ApplicationStatus, NotificationType } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';
import { writeAdminAuditLog } from '../services/adminAudit.service';
import { createNotification } from '../services/notification.service';

const prisma = new PrismaClient();

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

export async function getMyApplication(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const application = await prisma.teacherApplication.findUnique({
            where: { userId: authReq.user.userId },
        });

        return res.status(200).json(application);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch application status',
            details: (error as Error).message,
        });
    }
}

export async function getAllApplicationsAdmin(req: Request, res: Response): Promise<Response> {
    try {
        const { status, search } = req.query;

        const where: any = {};

        if (status && typeof status === 'string' && status !== 'ALL') {
            where.status = status.toUpperCase() as ApplicationStatus;
        }

        if (search && typeof search === 'string') {
            where.user = {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const applications = await prisma.teacherApplication.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json(applications);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to fetch applications',
            details: (error as Error).message,
        });
    }
}

export async function approveApplication(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const applicationId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(applicationId)) {
            return res.status(400).json({ error: 'Invalid application ID' });
        }

        const application = await prisma.teacherApplication.findUnique({
            where: { id: applicationId },
            include: { user: true },
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status === ApplicationStatus.APPROVED) {
            return res.status(400).json({ error: 'Application is already approved' });
        }

        // Update application status and user role in a transaction
        const [updatedApp, updatedUser] = await prisma.$transaction([
            prisma.teacherApplication.update({
                where: { id: applicationId },
                data: { status: ApplicationStatus.APPROVED, rejectionReason: null },
            }),
            prisma.user.update({
                where: { id: application.userId },
                data: { role: Role.TEACHER },
            }),
        ]);

        // Create notification
        await createNotification({
            userId: application.userId,
            type: NotificationType.PROJECT_GRADED,
            title: 'Instructor Application Approved',
            message: 'Congratulations! Your instructor application has been approved. Start creating your courses now.',
            link: '/dashboard',
            sendEmail: true,
        });

        // Write Admin audit log
        await writeAdminAuditLog({
            adminId: authReq.user?.userId,
            action: 'UPDATE',
            resource: 'TEACHER_APPLICATION',
            resourceId: applicationId,
            description: `Approved teacher application for user ${application.user.username}`,
            before: { status: application.status },
            after: { status: ApplicationStatus.APPROVED },
        });

        return res.status(200).json({ application: updatedApp, user: updatedUser });
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to approve application',
            details: (error as Error).message,
        });
    }
}

export async function rejectApplication(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        const applicationId = Number.parseInt(req.params.id, 10);
        const { reason } = req.body;

        if (Number.isNaN(applicationId)) {
            return res.status(400).json({ error: 'Invalid application ID' });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const application = await prisma.teacherApplication.findUnique({
            where: { id: applicationId },
            include: { user: true },
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const updatedApp = await prisma.teacherApplication.update({
            where: { id: applicationId },
            data: { status: ApplicationStatus.REJECTED, rejectionReason: reason.trim() },
        });

        // Create notification
        await createNotification({
            userId: application.userId,
            type: NotificationType.PROJECT_GRADED,
            title: 'Instructor Application Rejected',
            message: `Your instructor application was rejected. Reason: ${reason.trim()}. You can edit and resubmit your profile.`,
            sendEmail: true,
        });

        // Write Admin audit log
        await writeAdminAuditLog({
            adminId: authReq.user?.userId,
            action: 'UPDATE',
            resource: 'TEACHER_APPLICATION',
            resourceId: applicationId,
            description: `Rejected teacher application for user ${application.user.username}. Reason: ${reason.trim()}`,
            before: { status: application.status, rejectionReason: application.rejectionReason },
            after: { status: ApplicationStatus.REJECTED, rejectionReason: reason.trim() },
        });

        return res.status(200).json(updatedApp);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to reject application',
            details: (error as Error).message,
        });
    }
}

export async function applyToBecomeTeacher(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { bio, qualifications, cvUrl, topics } = req.body;

        if (!bio || bio.trim().length < 30) {
            return res.status(400).json({ error: 'Bio must be at least 30 characters.' });
        }

        if (!qualifications || qualifications.trim().length < 20) {
            return res.status(400).json({ error: 'Qualifications / Experience must be at least 20 characters.' });
        }

        if (!topics || !topics.trim()) {
            return res.status(400).json({ error: 'Teaching topics are required.' });
        }

        if (cvUrl && !cvUrl.startsWith('http://') && !cvUrl.startsWith('https://')) {
            return res.status(400).json({ error: 'CV/Portfolio URL must be valid (start with http:// or https://).' });
        }

        // Check if user is already a teacher
        const userObj = await prisma.user.findUnique({ where: { id: authReq.user.userId } });
        if (userObj?.role === Role.TEACHER) {
            return res.status(400).json({ error: 'You are already an instructor.' });
        }

        const existingApp = await prisma.teacherApplication.findUnique({
            where: { userId: authReq.user.userId },
        });

        let application;

        if (existingApp) {
            if (existingApp.status === ApplicationStatus.APPROVED) {
                return res.status(400).json({ error: 'Your application has already been approved.' });
            }
            if (existingApp.status === ApplicationStatus.PENDING) {
                return res.status(400).json({ error: 'Your application is pending Admin approval.' });
            }

            // If REJECTED, update and reset status to PENDING
            application = await prisma.teacherApplication.update({
                where: { id: existingApp.id },
                data: {
                    bio: bio.trim(),
                    qualifications: qualifications.trim(),
                    cvUrl: cvUrl ? cvUrl.trim() : null,
                    topics: topics.trim(),
                    status: ApplicationStatus.PENDING,
                    rejectionReason: null,
                },
            });
        } else {
            application = await prisma.teacherApplication.create({
                data: {
                    userId: authReq.user.userId,
                    bio: bio.trim(),
                    qualifications: qualifications.trim(),
                    cvUrl: cvUrl ? cvUrl.trim() : null,
                    topics: topics.trim(),
                    status: ApplicationStatus.PENDING,
                },
            });
        }

        return res.status(200).json(application);
    } catch (error) {
        return res.status(500).json({
            error: 'Unable to submit teacher application',
            details: (error as Error).message,
        });
    }
}

