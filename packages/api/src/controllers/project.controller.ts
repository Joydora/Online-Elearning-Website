import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../types/auth';
import { fetchRecentCommits, parseGithubRepoUrl } from '../services/github.service';

const prisma = new PrismaClient();

type AuthRequest = Request & { user?: AuthenticatedUser };

async function assertCourseOwner(courseId: number, user: AuthenticatedUser): Promise<void> {
    if (user.role === 'ADMIN') return;
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (course.teacherId !== user.userId) throw new Error('COURSE_FORBIDDEN');
}

async function assertProjectOwner(projectId: number, user: AuthenticatedUser): Promise<{ id: number; courseId: number }> {
    const p = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, courseId: true, course: { select: { teacherId: true } } },
    });
    if (!p) throw new Error('PROJECT_NOT_FOUND');
    if (user.role !== 'ADMIN' && p.course.teacherId !== user.userId) throw new Error('COURSE_FORBIDDEN');
    return { id: p.id, courseId: p.courseId };
}

function parseDeadline(raw: unknown): Date | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null || raw === '') return null;
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---------------- TEACHER ----------------

export async function createProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const courseId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'Course id must be a number' });

        try {
            await assertCourseOwner(courseId, authReq.user);
        } catch (err) {
            const m = (err as Error).message;
            if (m === 'COURSE_NOT_FOUND') return res.status(404).json({ error: 'Course not found' });
            if (m === 'COURSE_FORBIDDEN') return res.status(403).json({ error: 'Not your course' });
            throw err;
        }

        const { title, description, requirements, deadline } = (req.body ?? {}) as Record<string, unknown>;
        if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title (string) is required' });
        if (typeof description !== 'string' || !description.trim()) return res.status(400).json({ error: 'description (string) is required' });

        const dl = parseDeadline(deadline);
        if (dl === undefined && deadline !== undefined && deadline !== null && deadline !== '') {
            return res.status(400).json({ error: 'deadline must be a parsable ISO date or null' });
        }

        const project = await prisma.project.create({
            data: {
                courseId,
                title: title.trim(),
                description: description.trim(),
                requirements: typeof requirements === 'string' ? requirements : null,
                deadline: dl ?? null,
            },
        });
        return res.status(201).json(project);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to create project', details: (error as Error).message });
    }
}

export async function updateProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const projectId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

        try {
            await assertProjectOwner(projectId, authReq.user);
        } catch (err) {
            const m = (err as Error).message;
            if (m === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
            if (m === 'COURSE_FORBIDDEN') return res.status(403).json({ error: 'Not your course' });
            throw err;
        }

        const { title, description, requirements, deadline } = (req.body ?? {}) as Record<string, unknown>;
        const dl = parseDeadline(deadline);
        if (dl === undefined && deadline !== undefined && deadline !== null && deadline !== '') {
            return res.status(400).json({ error: 'deadline must be a parsable ISO date or null' });
        }

        const updated = await prisma.project.update({
            where: { id: projectId },
            data: {
                title: typeof title === 'string' ? title.trim() : undefined,
                description: typeof description === 'string' ? description.trim() : undefined,
                requirements: requirements === undefined ? undefined : (typeof requirements === 'string' ? requirements : null),
                deadline: deadline === undefined ? undefined : dl,
            },
        });
        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to update project', details: (error as Error).message });
    }
}

export async function deleteProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const projectId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

        try {
            await assertProjectOwner(projectId, authReq.user);
        } catch (err) {
            const m = (err as Error).message;
            if (m === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
            if (m === 'COURSE_FORBIDDEN') return res.status(403).json({ error: 'Not your course' });
            throw err;
        }

        await prisma.project.delete({ where: { id: projectId } });
        return res.status(200).json({ deleted: true });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to delete project', details: (error as Error).message });
    }
}

// ---------------- BOTH (teacher list + student list) ----------------

export async function listCourseProjectsController(req: Request, res: Response): Promise<Response> {
    try {
        const courseId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(courseId)) return res.status(400).json({ error: 'Course id must be a number' });

        const projects = await prisma.project.findMany({
            where: { courseId },
            orderBy: { createdAt: 'asc' },
        });
        return res.status(200).json(projects);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to list projects', details: (error as Error).message });
    }
}

// ---------------- STUDENT ----------------

async function ensureStudentEnrolled(studentId: number, courseId: number) {
    const e = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
        select: { isActive: true, expiresAt: true },
    });
    if (!e) throw new Error('NOT_ENROLLED');
    if (!e.isActive || (e.expiresAt && e.expiresAt.getTime() <= Date.now())) {
        throw new Error('ENROLLMENT_EXPIRED');
    }
}

export async function submitProjectController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const projectId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

        const { repoUrl } = (req.body ?? {}) as { repoUrl?: unknown };
        if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
            return res.status(400).json({ error: 'repoUrl (string) is required' });
        }

        const parsed = parseGithubRepoUrl(repoUrl);
        if (!parsed) {
            return res.status(400).json({ error: 'repoUrl must be a public GitHub repo URL' });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, courseId: true },
        });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        try {
            await ensureStudentEnrolled(authReq.user.userId, project.courseId);
        } catch (err) {
            const m = (err as Error).message;
            if (m === 'NOT_ENROLLED') return res.status(403).json({ error: 'You are not enrolled in this course' });
            if (m === 'ENROLLMENT_EXPIRED') return res.status(403).json({ error: 'Your access has expired' });
            throw err;
        }

        const fetched = await fetchRecentCommits(parsed.owner, parsed.repo, 30);

        const submission = await prisma.projectSubmission.upsert({
            where: { studentId_projectId: { studentId: authReq.user.userId, projectId } },
            create: {
                projectId,
                studentId: authReq.user.userId,
                repoUrl: repoUrl.trim(),
                commitsJson: fetched.commits as unknown as object,
                lastFetchedAt: new Date(),
            },
            update: {
                repoUrl: repoUrl.trim(),
                commitsJson: fetched.commits as unknown as object,
                lastFetchedAt: new Date(),
            },
        });

        return res.status(200).json({ ...submission, githubNote: fetched.note ?? null });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to submit project', details: (error as Error).message });
    }
}

export async function getMySubmissionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });

        const projectId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

        const submission = await prisma.projectSubmission.findUnique({
            where: { studentId_projectId: { studentId: authReq.user.userId, projectId } },
        });
        return res.status(200).json(submission);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to fetch submission', details: (error as Error).message });
    }
}

// ---------------- TEACHER (review) ----------------

export async function listProjectSubmissionsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const projectId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

        try {
            await assertProjectOwner(projectId, authReq.user);
        } catch (err) {
            const m = (err as Error).message;
            if (m === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
            if (m === 'COURSE_FORBIDDEN') return res.status(403).json({ error: 'Not your course' });
            throw err;
        }

        const submissions = await prisma.projectSubmission.findMany({
            where: { projectId },
            include: { student: { select: { id: true, username: true, firstName: true, lastName: true, email: true } } },
            orderBy: { submittedAt: 'asc' },
        });
        return res.status(200).json(submissions);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to list submissions', details: (error as Error).message });
    }
}

export async function refreshSubmissionCommitsController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const submissionId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(submissionId)) return res.status(400).json({ error: 'Submission id must be a number' });

        const sub = await prisma.projectSubmission.findUnique({
            where: { id: submissionId },
            select: { id: true, repoUrl: true, projectId: true, project: { select: { course: { select: { teacherId: true } } } } },
        });
        if (!sub) return res.status(404).json({ error: 'Submission not found' });
        if (authReq.user.role !== 'ADMIN' && sub.project.course.teacherId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Not your course' });
        }

        const parsed = parseGithubRepoUrl(sub.repoUrl);
        if (!parsed) return res.status(400).json({ error: 'Stored repoUrl is not a valid GitHub URL' });

        const fetched = await fetchRecentCommits(parsed.owner, parsed.repo, 30);
        const updated = await prisma.projectSubmission.update({
            where: { id: submissionId },
            data: {
                commitsJson: fetched.commits as unknown as object,
                lastFetchedAt: new Date(),
            },
        });
        return res.status(200).json({ ...updated, githubNote: fetched.note ?? null });
    } catch (error) {
        return res.status(500).json({ error: 'Unable to refresh commits', details: (error as Error).message });
    }
}

export async function gradeSubmissionController(req: Request, res: Response): Promise<Response> {
    try {
        const authReq = req as AuthRequest;
        if (!authReq.user) return res.status(401).json({ error: 'User not authenticated' });
        const submissionId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(submissionId)) return res.status(400).json({ error: 'Submission id must be a number' });

        const sub = await prisma.projectSubmission.findUnique({
            where: { id: submissionId },
            select: { id: true, project: { select: { course: { select: { teacherId: true } } } } },
        });
        if (!sub) return res.status(404).json({ error: 'Submission not found' });
        if (authReq.user.role !== 'ADMIN' && sub.project.course.teacherId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Not your course' });
        }

        const { teacherFeedback, teacherGrade } = (req.body ?? {}) as Record<string, unknown>;

        let grade: number | null | undefined = undefined;
        if (teacherGrade !== undefined) {
            if (teacherGrade === null || teacherGrade === '') grade = null;
            else {
                const n = Number(teacherGrade);
                if (!Number.isInteger(n) || n < 0 || n > 100) {
                    return res.status(400).json({ error: 'teacherGrade must be an integer 0..100 or null' });
                }
                grade = n;
            }
        }

        const feedback =
            teacherFeedback === undefined
                ? undefined
                : typeof teacherFeedback === 'string'
                ? teacherFeedback
                : null;

        const updated = await prisma.projectSubmission.update({
            where: { id: submissionId },
            data: {
                teacherFeedback: feedback,
                teacherGrade: grade,
            },
        });
        return res.status(200).json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Unable to grade submission', details: (error as Error).message });
    }
}
